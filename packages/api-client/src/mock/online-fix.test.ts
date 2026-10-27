import { it, expect } from 'vitest';
import { demoController, demoTransport } from './index.js';
import { createAuthClient, memoryCredentialStore } from '../auth.js';
import { createOnlineStoreClient } from '../storefront-management.js';
import { createCatalogClient } from '../catalog.js';
import { editProductSchema } from '@inventory/contracts';
import { demoId } from './identity.js';
it('catalog fixes move fresh selections to ready and keep published edits server-revalidated in demo state', async () => {
  demoController.configure('owner', 'store-live');
  const auth = createAuthClient('http://localhost:3100', demoTransport, memoryCredentialStore());
  const online = createOnlineStoreClient(auth.organizationRequest, demoId(1), demoId(2));
  const catalog = createCatalogClient(auth.organizationRequest, demoId(1));
  const listing = (await online.listings({ issue: 'TITLE_MISSING' })).items[0]!;
  const product = await catalog.get(listing.productId);
  const { id, createdAt, price, ...fields } = product;
  void id;
  void createdAt;
  void price;
  const input = editProductSchema.parse({ ...fields, name: 'Repaired online product' });
  const edited = await catalog.edit(product.id, input);
  expect(edited.version).toBe(product.version + 1);
  await expect(catalog.edit(product.id, input)).rejects.toMatchObject({ status: 409 });
  const repaired = (await online.detail(listing.id)).listing;
  expect(repaired.status).toBe('ready');
  await online.command({
    action: 'publish',
    items: [{ id: listing.id, version: repaired.version }],
    all: false,
    idempotencyKey: demoId(99000),
  });
  await catalog.edit(product.id, { ...input, description: '', version: edited.version });
  const invalid = (await online.detail(listing.id)).listing;
  expect(invalid.status).toBe('needs_changes');
  expect(invalid.issues.some((i) => i.code === 'DESCRIPTION_MISSING')).toBe(true);
});
