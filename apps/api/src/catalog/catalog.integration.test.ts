import { expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { native } from '../../test/auth-fixture.js';
import { organizationFixture } from '../../test/organization-fixture.js';
import { productSchema, productPageSchema, categorySchema } from '@inventory/contracts';
const fixture = organizationFixture();
let productId: string, categoryId: string, childId: string;
it('creates scoped categories and products, rejects duplicate identifiers and never accepts quantity edits', async () => {
  const { api, a, b, root, ownerToken, otherToken, viewerToken } = fixture();
  categoryId = categorySchema.parse(
    (
      await api()
        .post(`${root}/${a}/categories`)
        .set(native(ownerToken))
        .send({ name: 'Clothing' })
        .expect(201)
    ).body,
  ).id;
  childId = categorySchema.parse(
    (
      await api()
        .post(`${root}/${a}/categories`)
        .set(native(ownerToken))
        .send({ name: 'Shirts', parentId: categoryId })
        .expect(201)
    ).body,
  ).id;
  const input = { name: 'Shirt', sku: 'shirt-1', barcodes: ['123456789'], categoryId: childId };
  const product = productSchema.parse(
    (await api().post(`${root}/${a}/products`).set(native(ownerToken)).send(input).expect(201))
      .body,
  );
  productId = product.id;
  expect(product.sku).toBe('SHIRT-1');
  await api()
    .post(`${root}/${a}/products`)
    .set(native(ownerToken))
    .send({ ...input, sku: 'different' })
    .expect(409);
  await api()
    .post(`${root}/${a}/products`)
    .set(native(ownerToken))
    .send({ ...input, barcodes: [], onHand: '10' })
    .expect(400);
  await api()
    .post(`${root}/${a}/products`)
    .set(native(ownerToken))
    .send({ name: 'Service', sku: 'SERVICE', type: 'service', trackInventory: true })
    .expect(400);
  await api()
    .post(`${root}/${a}/products`)
    .set(native(ownerToken))
    .send({ name: 'Image', sku: 'IMG', images: ['http://insecure.test/image'] })
    .expect(400);
  await api().get(`${root}/${a}/products`).set(native(viewerToken)).expect(403);
  await api().get(`${root}/${b}/products/${productId}`).set(native(ownerToken)).expect(404);
  await api().get(`${root}/${b}/products/${productId}`).set(native(otherToken)).expect(404);
  await api()
    .post(`${root}/${b}/products`)
    .set(native(otherToken))
    .send({ ...input, categoryId: null })
    .expect(201);
});
it('paginates and filters with stable results, resolves barcode search and prevents invalid categories', async () => {
  const { api, a, b, root, ownerToken, otherToken, db } = fixture();
  await api()
    .post(`${root}/${a}/products`)
    .set(native(ownerToken))
    .send({ name: 'Trousers', sku: 'TROUSERS' })
    .expect(201);
  const first = productPageSchema.parse(
    (await api().get(`${root}/${a}/products?limit=1`).set(native(ownerToken)).expect(200)).body,
  );
  expect(first.total).toBe(2);
  expect(first.hasMore).toBe(true);
  const second = productPageSchema.parse(
    (await api().get(`${root}/${a}/products?limit=1&offset=1`).set(native(ownerToken)).expect(200))
      .body,
  );
  expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  const lookup = productPageSchema.parse(
    (await api().get(`${root}/${a}/products?code=123456789`).set(native(ownerToken)).expect(200))
      .body,
  );
  expect(lookup.items[0]?.id).toBe(productId);
  await api().get(`${root}/${a}/products?sort=password`).set(native(ownerToken)).expect(400);
  await api()
    .patch(`${root}/${a}/categories/${categoryId}`)
    .set(native(ownerToken))
    .send({ name: 'Cycle', parentId: childId, version: 1 })
    .expect(409);
  await api()
    .patch(`${root}/${a}/categories/${childId}`)
    .set(native(ownerToken))
    .send({ name: 'Shirts', parentId: categoryId, state: 'archived', version: 1 })
    .expect(409);
  await api()
    .post(`${root}/${b}/products`)
    .set(native(otherToken))
    .send({ name: 'Cross', sku: 'CROSS', categoryId })
    .expect(409);
  await expect(
    db().query(
      'INSERT INTO catalog_categories(id,business_id,name,parent_id,state) VALUES($1,$2,$3,$4,$5)',
      [randomUUID(), b, 'Cross', categoryId, 'active'],
    ),
  ).rejects.toMatchObject({ code: '23503' });
});
it('preserves versions, enforces immutable archival and denies scoped catalog changes', async () => {
  const { api, a, root, ownerToken, managerToken, managerId, storeA } = fixture();
  await api()
    .patch(`${root}/${a}/members/${managerId}`)
    .set(native(ownerToken))
    .send({
      role: 'manager',
      state: 'active',
      version: 1,
      scope: { storeId: storeA, warehouseId: null },
    })
    .expect(200);
  await api()
    .post(`${root}/${a}/products`)
    .set(native(managerToken))
    .send({ name: 'Denied', sku: 'DENIED' })
    .expect(403);
  await api().get(`${root}/${a}/products`).set(native(managerToken)).expect(200);
  const input = {
    name: 'Archived shirt',
    sku: 'SHIRT-1',
    categoryId: childId,
    barcodes: ['123456789'],
    state: 'archived',
    version: 1,
  };
  await api()
    .patch(`${root}/${a}/products/${productId}`)
    .set(native(ownerToken))
    .send(input)
    .expect(200);
  await api()
    .patch(`${root}/${a}/products/${productId}`)
    .set(native(ownerToken))
    .send({ ...input, state: 'active', version: 2 })
    .expect(409);
  const history = (await api().get(`${root}/${a}/audit`).set(native(ownerToken)).expect(200)).body;
  expect(history.events.some((e: { action: string }) => e.action === 'product.updated')).toBe(true);
});
