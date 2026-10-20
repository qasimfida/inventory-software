import { beforeAll } from 'vitest';
import { productSchema, pricingWorkspaceSchema } from '@inventory/contracts';
import { native } from './auth-fixture.js';
import { organizationFixture } from './organization-fixture.js';
export function stockFixture() {
  const organization = organizationFixture();
  let variantId: string, unitId: string;
  beforeAll(async () => {
    const { api, a, root, ownerToken } = organization();
    variantId = productSchema.parse(
      (
        await api()
          .post(`${root}/${a}/products`)
          .set(native(ownerToken))
          .send({ name: 'Stock item', sku: 'STOCK' })
          .expect(201)
      ).body,
    ).id;
    unitId = pricingWorkspaceSchema.parse(
      (
        await api()
          .get(`${root}/${a}/products/${variantId}/pricing`)
          .set(native(ownerToken))
          .expect(200)
      ).body,
    ).variants[0]!.baseUnitId;
  });
  return () => ({ ...organization(), variantId, unitId });
}
