import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = organizationFixture();
it('isolates salaries, validates stores, prevents duplicate/overlapping periods and overpayment atomically', async () => {
  const f = fixture(),
    base = `/api/v1/businesses/${f.a}/operations`,
    headers = native(f.ownerToken);
  for (const token of [f.viewerToken, f.managerToken])
    await f.api().get(base).set(native(token)).expect(403);
  await f.api().get(base).expect(401);
  await f.api().get(base).set(native(f.otherToken)).expect(404);
  const staff = {
    name: 'Demo employee',
    code: 'EMP-001',
    title: 'Clerk',
    storeId: f.storeA,
    salaryMinor: '50000',
    currency: 'USD',
    state: 'active',
  };
  await f
    .api()
    .post(`${base}/staff`)
    .set(headers)
    .send({ ...staff, storeId: f.storeB })
    .expect(404);
  const employee = (await f.api().post(`${base}/staff`).set(headers).send(staff).expect(201)).body;
  const cost = {
    kind: 'salary',
    staffId: employee.id,
    storeId: f.storeA,
    description: 'October salary',
    reference: 'PAY-001',
    periodStart: '2026-10-01',
    periodEnd: '2026-10-31',
    amountMinor: '50000',
    currency: 'USD',
    idempotencyKey: randomUUID(),
  };
  const created = (await f.api().post(`${base}/costs`).set(headers).send(cost).expect(201)).body;
  expect((await f.api().post(`${base}/costs`).set(headers).send(cost).expect(201)).body).toEqual(
    created,
  );
  await f
    .api()
    .post(`${base}/costs`)
    .set(headers)
    .send({ ...cost, idempotencyKey: randomUUID(), reference: 'PAY-002' })
    .expect(409);
  await f
    .api()
    .post(`${base}/costs`)
    .set(headers)
    .send({ ...cost, idempotencyKey: randomUUID(), periodEnd: '2026-09-01' })
    .expect(400);
  const payment = {
    amountMinor: '20000',
    reference: 'BANK-001',
    paidOn: '2026-10-23',
    idempotencyKey: randomUUID(),
  };
  const path = `${base}/costs/${created.id}/payments`;
  const paid = (await f.api().post(path).set(headers).send(payment).expect(201)).body;
  expect((await f.api().post(path).set(headers).send(payment).expect(201)).body).toEqual(paid);
  await f
    .api()
    .post(path)
    .set(headers)
    .send({ ...payment, idempotencyKey: randomUUID(), amountMinor: '40000', reference: 'BANK-002' })
    .expect(409);
  const detail = (
    await f.api().get(`${base}/costs/${created.id}?offset=0`).set(headers).expect(200)
  ).body;
  expect(detail.payments).toHaveLength(1);
  expect(detail.payments[0].reference).toBe('BANK-001');
  expect(detail.cost.paidMinor).toBe('20000');
  await f.api().get(`${base}/costs/${randomUUID()}`).set(headers).expect(404);
  const page = (await f.api().get(base).set(headers).expect(200)).body;
  expect(page.costs).toHaveLength(1);
  expect(page.costs[0].paidMinor).toBe('20000');
  expect(
    (await f.db().query('SELECT count(*)::int AS n FROM operational_cost_payments')).rows[0].n,
  ).toBe(1);
  await f
    .api()
    .patch(`${base}/staff/${employee.id}`)
    .set(headers)
    .send({ ...staff, version: 99 })
    .expect(409);
});
