import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { productSchema, stockWorkspaceSchema } from '@inventory/contracts';
import { stockFixture } from '../../test/stock-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = stockFixture();
it('filters every stock collection and count by product, with bounded history and no posting effects', async () => {
  const { api, root, a, ownerToken, warehouseA, variantId, unitId, db } = fixture();
  const second = productSchema.parse(
    (
      await api()
        .post(`${root}/${a}/products`)
        .set(native(ownerToken))
        .send({ name: 'Other item', sku: 'OTHER' })
        .expect(201)
    ).body,
  );
  for (const id of [variantId, second.id]) {
    await api()
      .post(`${root}/${a}/stock/movements`)
      .set(native(ownerToken))
      .send({
        variantId: id,
        unitId,
        warehouseId: warehouseA,
        type: 'opening',
        quantity: '10',
        reason: 'Product details fixture',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
    await api()
      .post(`${root}/${a}/stock/reservations`)
      .set(native(ownerToken))
      .send({
        variantId: id,
        unitId,
        warehouseId: warehouseA,
        quantity: '1',
        reason: 'Product reservation fixture',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
  }
  // Enough legitimate commands to cross the ledger's 50-row cursor boundary.
  for (let i = 0; i < 49; i++)
    await api()
      .post(`${root}/${a}/stock/movements`)
      .set(native(ownerToken))
      .send({
        variantId,
        unitId,
        warehouseId: warehouseA,
        type: 'receive',
        quantity: '1',
        reason: 'History page fixture',
        idempotencyKey: randomUUID(),
      })
      .expect(201);
  const path = `${root}/${a}/stock?warehouseId=${warehouseA}&productId=${variantId}&limit=1`;
  const read = async (extra = '') =>
    stockWorkspaceSchema.parse(
      (
        await api()
          .get(path + extra)
          .set(native(ownerToken))
          .expect(200)
      ).body,
    );
  const before = (
    await db().query('SELECT count(*) FROM stock_movements WHERE business_id=$1', [a])
  ).rows;
  const page = await read();
  expect(page.totals).toEqual({ items: 1, balances: 1, reservations: 1 });
  expect(page.items.map((p) => p.id)).toEqual([variantId]);
  for (const rows of [page.balances, page.movements, page.reservations])
    expect(rows.every((r) => r.variantId === variantId)).toBe(true);
  expect(page.movements).toHaveLength(50);
  expect(page.nextCursor).toBeTruthy();
  const older = await read('&cursor=' + page.nextCursor);
  expect(older.movements).toHaveLength(1);
  expect(older.movements.some((m) => page.movements.some((n) => n.id === m.id))).toBe(false);
  expect((await read('&offset=1')).balances).toEqual([]);
  expect(
    (await db().query('SELECT count(*) FROM stock_movements WHERE business_id=$1', [a])).rows,
  ).toEqual(before);
  expect(
    (
      await api()
        .get(`${root}/${a}/warehouses/${warehouseA}/reconciliation`)
        .set(native(ownerToken))
        .expect(200)
    ).body.consistent,
  ).toBe(true);
}, 30000);
it('rejects malformed, missing and foreign products, unauthenticated and unauthorized warehouse access', async () => {
  const {
    api,
    root,
    a,
    b,
    ownerToken,
    otherToken,
    viewerToken,
    viewerId,
    warehouseA,
    variantId,
    db,
  } = fixture();
  const foreign = productSchema.parse(
    (
      await api()
        .post(`${root}/${b}/products`)
        .set(native(otherToken))
        .send({ name: 'Private', sku: 'PRIVATE' })
        .expect(201)
    ).body,
  );
  const path = `${root}/${a}/stock?warehouseId=${warehouseA}`;
  await api().get(path).expect(401);
  expect([403, 404]).toContain(
    (
      await api()
        .get(path + '&productId=' + variantId)
        .set(native(otherToken))
    ).status,
  );
  for (const id of [foreign.id, randomUUID()])
    await api()
      .get(path + '&productId=' + id)
      .set(native(ownerToken))
      .expect(404);
  await api()
    .get(path + '&productId=invalid')
    .set(native(ownerToken))
    .expect(400);
  await db().query(
    "UPDATE business_memberships SET role='custom',permissions=ARRAY['products.read'] WHERE business_id=$1 AND account_id=$2",
    [a, viewerId],
  );
  await api()
    .get(path + '&productId=' + variantId)
    .set(native(viewerToken))
    .expect(403);
});
