import { openCash } from '../../test/cash-fixture.js';
import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { customerPageSchema, customerStatementSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
import { OrganizationScope } from '../organization/organization.scope.js';
import { ReceivableCore } from './receivable-core.js';
const fixture = stockFixture();
it('scopes PII, detects duplicates and denies credit escalation through profile payloads', async () => {
  const { api, root, a, storeA, ownerToken, viewerToken, otherToken, db } = fixture(),
    path = `${root}/${a}`,
    h = native(ownerToken);
  const profile = {
    storeId: storeA,
    code: 'CUST',
    name: 'Sensitive Name',
    email: 'private@example.test',
    phone: '+923001234567',
    currency: 'USD',
  };
  const id = String(
    (await api().post(`${path}/customers`).set(h).send(profile).expect(201)).body.id,
  );
  await api()
    .post(`${path}/customers`)
    .set(h)
    .send({ ...profile, code: 'DUP' })
    .expect(409);
  await api()
    .post(`${path}/customers`)
    .set(h)
    .send({ ...profile, code: 'ESCALATE', creditEnabled: true })
    .expect(400);
  await api().get(`${path}/customers?storeId=${storeA}`).set(native(viewerToken)).expect(403);
  await api().get(`${path}/customers/${id}/statement`).set(native(otherToken)).expect(404);
  const page = customerPageSchema.parse(
    (
      await api()
        .get(`${path}/customers?storeId=${storeA}&search=private%40example.test`)
        .set(h)
        .expect(200)
    ).body,
  );
  expect(page.customers).toHaveLength(1);
  expect(page.customers[0]!.creditEnabled).toBe(false);
  const audit = (
    await db().query('SELECT before_data,after_data FROM organization_audit WHERE resource_id=$1', [
      id,
    ])
  ).rows;
  expect(JSON.stringify(audit)).not.toContain('Sensitive Name');
  expect(JSON.stringify(audit)).not.toContain('private@example.test');
});
it('serializes credit purchases, enforces holds/override permissions and allocates partial cash exactly once', async () => {
  const { api, root, a, storeA, warehouseA, ownerToken, ownerId, viewerId, application } =
      fixture(),
    path = `${root}/${a}`,
    h = native(ownerToken);
  const customerId = String(
    (
      await api()
        .post(`${path}/customers`)
        .set(h)
        .send({ storeId: storeA, code: 'CREDIT', name: 'Credit customer', currency: 'USD' })
        .expect(201)
    ).body.id,
  );
  await api()
    .patch(`${path}/customers/${customerId}/credit`)
    .set(h)
    .send({
      creditEnabled: true,
      creditHold: false,
      creditLimitMinor: '1000',
      termsDays: 30,
      version: 1,
    })
    .expect(200);
  await openCash(fixture());
  const scope = application().get(OrganizationScope),
    credit = application().get(ReceivableCore);
  const issue = (accountId: string, amountMinor: string, overrideReason = '') =>
    scope.run({ accountId, requestId: randomUUID() }, a, 'customers.read', async (ctx) => {
      const saleId = randomUUID();
      // Isolate credit rules using an already-posted sale header fixture. Checkout has its own HTTP suite.
      await ctx.tx.query(
        'INSERT INTO sales(id,business_id,store_id,warehouse_id,customer_id,currency,net_minor,tax_minor,total_minor,cash_received_minor,change_minor,actor_id) VALUES($1,$2,$3,$4,$5,$8,$6,0,$6,0,0,$7)',
        [saleId, a, storeA, warehouseA, customerId, amountMinor, accountId, 'USD'],
      );
      return credit.issue(ctx, {
        customerId,
        storeId: storeA,
        warehouseId: warehouseA,
        saleId,
        currency: 'USD',
        amountMinor,
        overrideReason,
      });
    });
  const results = await Promise.allSettled([issue(ownerId, '700'), issue(ownerId, '700')]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const statement = customerStatementSchema.parse(
    (await api().get(`${path}/customers/${customerId}/statement`).set(h).expect(200)).body,
  );
  expect(statement.outstandingMinor).toBe('700');
  const payment = {
    receivableId: statement.receivables[0]!.id,
    amountMinor: '200',
    reference: 'CASH-001',
    idempotencyKey: randomUUID(),
  };
  await api().post(`${path}/customers/${customerId}/payments`).set(h).send(payment).expect(201);
  await api().post(`${path}/customers/${customerId}/payments`).set(h).send(payment).expect(201);
  await api()
    .post(`${path}/customers/${customerId}/payments`)
    .set(h)
    .send({ ...payment, amountMinor: '501', idempotencyKey: randomUUID() })
    .expect(409);
  expect(
    customerStatementSchema.parse(
      (await api().get(`${path}/customers/${customerId}/statement`).set(h).expect(200)).body,
    ).outstandingMinor,
  ).toBe('500');
  await api()
    .patch(`${path}/members/${viewerId}`)
    .set(h)
    .send({ role: 'cashier', state: 'active', version: 1 })
    .expect(200);
  await expect(issue(viewerId, '100', 'Unauthorized override')).rejects.toMatchObject({
    status: 403,
  });
  await api()
    .patch(`${path}/customers/${customerId}/credit`)
    .set(h)
    .send({
      creditEnabled: true,
      creditHold: true,
      creditLimitMinor: '1000',
      termsDays: 30,
      version: 2,
    })
    .expect(200);
  await expect(issue(ownerId, '100')).rejects.toMatchObject({ status: 409 });
  await expect(issue(ownerId, '100', 'Owner-approved exception')).resolves.toEqual(
    expect.any(String),
  );
});
