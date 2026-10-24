import { expect, it } from 'vitest';
import { posItemsSchema, platformOverviewSchema } from '@inventory/contracts';
import { saleFixture } from '../../test/sale-fixture.js';
import { native } from '../../test/auth-fixture.js';
const fixture = saleFixture();
it('unifies barcode/name lookup, returns scoped base prices and honors stock/currency filters', async () => {
  const f = fixture();
  await f
    .db()
    .query(
      "INSERT INTO catalog_identifiers(business_id,product_id,variant_id,kind,code) VALUES($1,$2,$2,'barcode','LOOKUP-123')",
      [f.a, f.variantId],
    );
  const get = (q: object = {}) =>
    f
      .api()
      .get(`${f.path}/pos/items`)
      .set(f.h)
      .query({ warehouseId: f.warehouseA, ...q });
  const data = posItemsSchema.parse(
    (await get({ search: 'LOOKUP-123', currency: 'USD', availability: 'in-stock' }).expect(200))
      .body,
  );
  expect(data.items).toHaveLength(1);
  expect(data.items[0]?.price).toMatchObject({ unitPrice: '12.500000', currency: 'USD' });
  expect((await get({ search: 'LOOKUP-123', currency: 'PKR' }).expect(200)).body.items).toEqual([]);
  expect(
    (await get({ search: 'LOOKUP-123', availability: 'out-of-stock' }).expect(200)).body.items,
  ).toEqual([]);
  await f.api().get(`${f.path}/pos/items`).query({ warehouseId: f.warehouseA }).expect(401);
  await f
    .api()
    .get(`${f.path}/pos/items`)
    .set(native(f.viewerToken))
    .query({ warehouseId: f.warehouseA })
    .expect(403);
  await f
    .api()
    .get(`${f.path}/pos/items`)
    .set(native(f.otherToken))
    .query({ warehouseId: f.warehouseA })
    .expect(404);
  await get({ availability: 'invalid' }).expect(400);
  await f.api().get(`${f.path}/reports/overview`).set(f.h).query({ storeId: f.storeB }).expect(404);
  await f.api().get(`${f.path}/reports/overview`).set(f.h).query({ storeId: f.storeA }).expect(200);
});
it('protects platform analytics and business listing with active platform administrator authority', async () => {
  const f = fixture(),
    path = '/api/v1/auth/security/platform/overview';
  await f.api().get(path).expect(401);
  await f.api().get(path).set(f.h).expect(403);
  await f.db().query('INSERT INTO platform_administrators(account_id) VALUES($1)', [f.ownerId]);
  const data = platformOverviewSchema.parse((await f.api().get(path).set(f.h).expect(200)).body);
  expect(data.totals.businesses).toBe('2');
  expect(data.registrations).toHaveLength(30);
  expect(data.businesses).toHaveLength(2);
  expect(
    (await f.api().get(path).set(f.h).query({ search: 'Business A' }).expect(200)).body.businesses,
  ).toHaveLength(1);
  await f.api().get(path).set(native(f.viewerToken)).expect(403);
  await f.api().get(path).set(f.h).query({ offset: -1 }).expect(400);
});

it('lists unpriced active products without bypassing checkout price validation', async () => {
  const f = fixture();
  const product = (
    await f
      .api()
      .post(`${f.path}/products`)
      .set(f.h)
      .send({
        name: 'Unpriced product',
        sku: 'UNPRICED',
        images: ['https://example.com/product.png'],
      })
      .expect(201)
  ).body;
  const data = posItemsSchema.parse(
    (
      await f
        .api()
        .get(`${f.path}/pos/items`)
        .set(f.h)
        .query({ warehouseId: f.warehouseA, currency: 'USD', search: 'UNPRICED' })
        .expect(200)
    ).body,
  );
  expect(data.items).toHaveLength(1);
  expect(data.items[0]?.price).toBeNull();
  expect(data.items[0]?.images).toEqual(['https://example.com/product.png']);
  const unitId = data.items[0]!.unitId;
  await f
    .api()
    .post(`${f.path}/pos/quotes`)
    .set(f.h)
    .send({
      warehouseId: f.warehouseA,
      customerId: null,
      lines: [{ variantId: product.id, unitId, quantity: '1' }],
    })
    .expect(409);
});
