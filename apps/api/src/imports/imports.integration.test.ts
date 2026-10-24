import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = organizationFixture();
it('imports stock atomically, replays duplicates and rejects tenant/permission violations', async () => {
  const f = fixture(),
    path = `/api/v1/businesses/${f.a}/imports/products`,
    headers = native(f.ownerToken);
  const row = {
    sku: 'BULK-1',
    name: 'Bulk product',
    description: '',
    price: '12.50',
    currency: 'USD',
    quantity: '5',
  };
  const input = { warehouseId: f.warehouseA, rows: [row], idempotencyKey: randomUUID() };
  await f.api().post(path).set(native(f.viewerToken)).send(input).expect(403);
  await f.api().post(path).set(native(f.otherToken)).send(input).expect(404);
  const first = (await f.api().post(path).set(headers).send(input).expect(201)).body;
  expect((await f.api().post(path).set(headers).send(input).expect(201)).body).toEqual(first);
  await f
    .api()
    .post(path)
    .set(headers)
    .send({ ...input, idempotencyKey: randomUUID(), rows: [{ ...row, sku: 'ROLLBACK-1' }, row] })
    .expect(409);
  expect(
    (await f.db().query("SELECT 1 FROM catalog_products WHERE sku='ROLLBACK-1'")).rowCount,
  ).toBe(0);
  const totals = (
    await f
      .db()
      .query(
        'SELECT sum(quantity_delta)::text AS quantity FROM stock_movements WHERE business_id=$1',
        [f.a],
      )
  ).rows[0];
  expect(Number(totals.quantity)).toBe(5);
  expect(
    (
      await f
        .db()
        .query('SELECT sum(on_hand)::text AS quantity FROM stock_balances WHERE business_id=$1', [
          f.a,
        ])
    ).rows[0].quantity,
  ).toBe(totals.quantity);
});
