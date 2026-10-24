import { expect, it } from 'vitest';
import { organizationFixture } from '../../test/organization-fixture.js';
import { native } from '../../test/auth-fixture.js';
import {
  apiErrorSchema,
  pricingWorkspaceSchema,
  productSchema,
  saleQuoteSchema,
} from '@inventory/contracts';
const fixture = organizationFixture();
it('explains missing pricing, then quotes the same cart after an authorized price is configured', async () => {
  const f = fixture(),
    root = `${f.root}/${f.a}`;
  const product = productSchema.parse(
    (
      await f
        .api()
        .post(`${root}/products`)
        .set(native(f.ownerToken))
        .send({ name: 'Unpriced cart item', sku: 'CART-NO-PRICE' })
        .expect(201)
    ).body,
  );
  const workspace = pricingWorkspaceSchema.parse(
    (
      await f
        .api()
        .get(`${root}/products/${product.id}/pricing`)
        .set(native(f.ownerToken))
        .expect(200)
    ).body,
  );
  const variant = workspace.variants[0]!;
  const cart = {
    warehouseId: f.warehouseA,
    customerId: null,
    lines: [
      {
        variantId: variant.id,
        unitId: variant.baseUnitId,
        quantity: '1',
        manualDiscountBasisPoints: 0,
      },
    ],
  };
  const rejected = await f
    .api()
    .post(`${root}/pos/quotes`)
    .set(native(f.ownerToken))
    .send(cart)
    .expect(409);
  expect(apiErrorSchema.parse(rejected.body)).toMatchObject({
    code: 'PRICE_UNAVAILABLE',
    retryable: false,
  });
  expect(rejected.body.message).toContain('Catalog & pricing');
  await f.api().post(`${root}/pos/quotes`).set(native(f.viewerToken)).send(cart).expect(403);
  await f
    .api()
    .post(`${f.root}/${f.b}/pos/quotes`)
    .set(native(f.otherToken))
    .send(cart)
    .expect(404);
  await f
    .api()
    .post(`${root}/prices`)
    .set(native(f.ownerToken))
    .send({
      variantId: variant.id,
      unitPrice: '12.50',
      currency: 'USD',
      taxBasisPoints: 0,
      taxInclusive: false,
      storeId: null,
      customerId: null,
      startsAt: new Date(Date.now() - 60000).toISOString(),
      endsAt: null,
    })
    .expect(201);
  const quoted = await f
    .api()
    .post(`${root}/pos/quotes`)
    .set(native(f.ownerToken))
    .send(cart)
    .expect(201);
  expect(saleQuoteSchema.parse(quoted.body).totalMinor).toBe('1250');
});
