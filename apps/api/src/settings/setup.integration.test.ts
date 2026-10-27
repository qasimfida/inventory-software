import { expect, it } from 'vitest';
import { companyProfileSchema, setupChecklistSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('derives setup from persisted data and denies unrelated or lower-tier accounts', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`;
  await f.api().get(`${path}/setup`).expect(401);
  await f.api().get(`${path}/setup`).set(native(f.viewerToken)).expect(403);
  await f.api().get(`${path}/setup`).set(native(f.otherToken)).expect(404);
  const initial = setupChecklistSchema.parse(
    (await f.api().get(`${path}/setup`).set(native(f.ownerToken)).expect(200)).body,
  );
  expect(initial).toEqual({
    dismissed: false,
    profile: false,
    currency: false,
    tax: false,
    locations: true,
    product: true,
    stock: false,
  });
  const values = {
    company: companyProfileSchema.parse({
      displayName: 'Setup test',
      address: 'Test address',
      transactionCurrency: 'PKR',
      taxBasisPoints: 0,
      receiptFooter: 'Thank you',
    }),
  };
  await f
    .api()
    .put(`${path}/settings`)
    .set(native(f.viewerToken))
    .send({ version: 0, values })
    .expect(403);
  await f
    .api()
    .put(`${path}/settings`)
    .set(native(f.ownerToken))
    .send({ version: 0, values })
    .expect(200);
  await f
    .api()
    .put(`${path}/settings`)
    .set(native(f.ownerToken))
    .send({ version: 0, values })
    .expect(409);
  const after = setupChecklistSchema.parse(
    (await f.api().get(`${path}/setup`).set(native(f.ownerToken)).expect(200)).body,
  );
  expect(after).toEqual({ ...initial, profile: true, currency: true, tax: true });
  await f
    .api()
    .put(`${path}/settings`)
    .set(native(f.ownerToken))
    .send({ version: 1, values: { company: { ...values.company, taxBasisPoints: -1 } } })
    .expect(400);
  const retained = (await f.api().get(`${path}/settings`).set(native(f.ownerToken)).expect(200))
    .body;
  expect(retained.values.company.transactionCurrency).toBe('PKR');
});
it('rejects scoped business-write grants and denies setup/profile mutation to a scoped manager', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`;
  await expect(
    f
      .db()
      .query(
        "UPDATE business_memberships SET role='custom',permissions=$1,scope_store_id=$2 WHERE business_id=$3 AND account_id=$4",
        [['business.read', 'business.write'], f.storeA, f.a, f.managerId],
      ),
  ).rejects.toThrow('membership_permissions_valid');
  await f
    .db()
    .query(
      'UPDATE business_memberships SET scope_store_id=$1 WHERE business_id=$2 AND account_id=$3',
      [f.storeA, f.a, f.managerId],
    );
  await f.api().get(`${path}/setup`).set(native(f.managerToken)).expect(403);
  const current = (await f.api().get(`${path}/settings`).set(native(f.ownerToken)).expect(200))
    .body;
  await f.api().put(`${path}/settings`).set(native(f.managerToken)).send(current).expect(403);
});
it('does not permit incomplete or unauthorized setup dismissal', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`;
  await f.api().post(`${path}/setup/dismiss`).set('x-inventory-client', 'native').expect(401);
  await f.api().post(`${path}/setup/dismiss`).set(native(f.viewerToken)).expect(403);
  await f.api().post(`${path}/setup/dismiss`).set(native(f.otherToken)).expect(404);
  await f.api().post(`${path}/setup/dismiss`).set(native(f.ownerToken)).expect(400);
  expect(
    (await f.api().get(`${path}/setup`).set(native(f.ownerToken)).expect(200)).body.dismissed,
  ).toBe(false);
});
it('persists completed dismissal after a real ledger opening and is idempotent', async () => {
  const f = fixture(),
    path = `${f.root}/${f.a}`,
    headers = native(f.ownerToken);
  await f
    .api()
    .post(`${path}/stock/movements`)
    .set(headers)
    .send({
      type: 'opening',
      quantity: '1',
      reasonCode: 'opening_balance',
      reason: 'Setup qualification',
      variantId: f.variantId,
      unitId: f.unitId,
      warehouseId: f.warehouseA,
      idempotencyKey: crypto.randomUUID(),
    })
    .expect(201);
  await f.api().post(`${path}/setup/dismiss`).set(headers).expect(201);
  await f.api().post(`${path}/setup/dismiss`).set(headers).expect(201);
  expect((await f.api().get(`${path}/setup`).set(headers).expect(200)).body.dismissed).toBe(true);
});
