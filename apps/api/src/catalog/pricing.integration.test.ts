import { beforeAll, expect, it } from 'vitest';
import { native } from '../../test/auth-fixture.js';
import { organizationFixture } from '../../test/organization-fixture.js';
import {
  productSchema,
  pricingWorkspaceSchema,
  unitSchema,
  quoteSchema,
  variantSchema,
} from '@inventory/contracts';
const fixture = organizationFixture();
let productId: string, unitId: string, boxId: string;
beforeAll(async () => {
  const { api, a, root, ownerToken } = fixture();
  productId = productSchema.parse(
    (
      await api()
        .post(`${root}/${a}/products`)
        .set(native(ownerToken))
        .send({ name: 'Priced item', sku: 'PRICE' })
        .expect(201)
    ).body,
  ).id;
  const data = pricingWorkspaceSchema.parse(
    (
      await api()
        .get(`${root}/${a}/products/${productId}/pricing`)
        .set(native(ownerToken))
        .expect(200)
    ).body,
  );
  unitId = data.units[0]!.id;
});
it('creates variants with isolated identifiers and explicit immutable same-dimension conversions', async () => {
  const { api, a, root, ownerToken, db } = fixture();
  const path = `${root}/${a}`;
  boxId = unitSchema.parse(
    (
      await api()
        .post(`${path}/units`)
        .set(native(ownerToken))
        .send({ name: 'Box', code: 'BOX', dimension: 'count' })
        .expect(201)
    ).body,
  ).id;
  await api()
    .post(`${path}/variants/${productId}/conversions`)
    .set(native(ownerToken))
    .send({ unitId: boxId, numerator: '12', denominator: '1' })
    .expect(201);
  await api()
    .post(`${path}/variants/${productId}/conversions`)
    .set(native(ownerToken))
    .send({ unitId: boxId, numerator: '10', denominator: '1' })
    .expect(409);
  const kg = unitSchema.parse(
    (
      await api()
        .post(`${path}/units`)
        .set(native(ownerToken))
        .send({ name: 'Kilogram', code: 'KG', dimension: 'mass' })
        .expect(201)
    ).body,
  );
  await api()
    .post(`${path}/variants/${productId}/conversions`)
    .set(native(ownerToken))
    .send({ unitId: kg.id, numerator: '1', denominator: '1' })
    .expect(409);
  const input = {
    name: 'Red',
    sku: 'PRICE-RED',
    attributes: { color: 'red' },
    baseUnitId: unitId,
    barcodes: ['RED123'],
  };
  variantSchema.parse(
    (
      await api()
        .post(`${path}/products/${productId}/variants`)
        .set(native(ownerToken))
        .send(input)
        .expect(201)
    ).body,
  );
  await api()
    .post(`${path}/products/${productId}/variants`)
    .set(native(ownerToken))
    .send({ ...input, sku: 'PRICE-RED-2', barcodes: [] })
    .expect(409);
  await expect(
    db().query('UPDATE catalog_conversions SET numerator=99 WHERE business_id=$1', [a]),
  ).rejects.toThrow('append-only');
});
it('selects current store prices before business prices, ignores future prices and applies one promotion', async () => {
  const { api, a, root, ownerToken, storeA } = fixture();
  const path = `${root}/${a}`;
  for (const price of [
    { unitPrice: '10', storeId: null, startsAt: '2020-01-01T00:00:00Z' },
    { unitPrice: '8', storeId: storeA, startsAt: '2021-01-01T00:00:00Z' },
    { unitPrice: '100', storeId: storeA, startsAt: '2100-01-01T00:00:00Z' },
  ])
    await api()
      .post(`${path}/prices`)
      .set(native(ownerToken))
      .send({ variantId: productId, currency: 'USD', taxBasisPoints: 1000, ...price })
      .expect(201);
  for (const promo of [
    { name: 'Winning', discountBasisPoints: 1000, priority: 10 },
    { name: 'Lower priority', discountBasisPoints: 5000, priority: 1 },
  ])
    await api()
      .post(`${path}/promotions`)
      .set(native(ownerToken))
      .send({ variantId: productId, startsAt: '2020-01-01T00:00:00Z', ...promo })
      .expect(201);
  const quote = quoteSchema.parse(
    (
      await api()
        .post(`${path}/price-quotes`)
        .set(native(ownerToken))
        .send({ variantId: productId, storeId: storeA, unitId: boxId, quantity: '2' })
        .expect(201)
    ).body,
  );
  expect(quote.baseQuantity).toBe('24');
  expect(quote.unitPrice).toBe('8.000000');
  expect(quote.totalMinor).toBe('19008');
  expect(quote.discountBasisPoints).toBe(1000);
});
it('enforces discount permissions, tenant boundaries and protected cost visibility', async () => {
  const { api, a, b, root, ownerToken, viewerToken, viewerId, storeA, otherToken, db } = fixture();
  const path = `${root}/${a}`;
  await api()
    .patch(`${path}/members/${viewerId}`)
    .set(native(ownerToken))
    .send({ role: 'cashier', state: 'active', version: 1 })
    .expect(200);
  await api()
    .post(`${path}/price-quotes`)
    .set(native(viewerToken))
    .send({
      variantId: productId,
      storeId: storeA,
      unitId,
      quantity: '1',
      manualDiscountBasisPoints: 5000,
    })
    .expect(403);
  await api()
    .post(`${root}/${b}/price-quotes`)
    .set(native(otherToken))
    .send({ variantId: productId, storeId: storeA, unitId, quantity: '1' })
    .expect(404);
  await api()
    .patch(`${path}/variants/${productId}`)
    .set(native(ownerToken))
    .send({
      name: 'Priced item',
      sku: 'PRICE',
      baseUnitId: unitId,
      cost: '5',
      costCurrency: 'USD',
      version: 1,
    })
    .expect(200);
  const data = pricingWorkspaceSchema.parse(
    (await api().get(`${path}/products/${productId}/pricing`).set(native(viewerToken)).expect(200))
      .body,
  );
  expect(data.variants.every((v) => v.cost === null)).toBe(true);
  await expect(db().query('DELETE FROM price_entries WHERE business_id=$1', [a])).rejects.toThrow(
    'append-only',
  );
});
it('withdraws a promotion with an append-only event and retains the historical price record', async () => {
  const { api, a, root, ownerToken, storeA, db } = fixture();
  const path = `${root}/${a}`;
  const promotions = (
    await api().get(`${path}/products/${productId}/pricing`).set(native(ownerToken)).expect(200)
  ).body.promotions as { id: string; name: string }[];
  for (const promotion of promotions)
    await api()
      .post(`${path}/promotions/${promotion.id}/withdraw`)
      .set(native(ownerToken))
      .send({})
      .expect(201);
  const quote = quoteSchema.parse(
    (
      await api()
        .post(`${path}/price-quotes`)
        .set(native(ownerToken))
        .send({ variantId: productId, storeId: storeA, unitId, quantity: '1' })
        .expect(201)
    ).body,
  );
  expect(quote.totalMinor).toBe('880');
  expect(quote.promotionId).toBeNull();
  expect(
    (await db().query('SELECT count(*) FROM price_promotions WHERE business_id=$1', [a])).rows[0]
      .count,
  ).toBe('2');
});
