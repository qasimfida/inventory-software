// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { productSchema, businessSchema } from '@inventory/contracts';
import { createCatalogClient } from '@inventory/api-client';
import { ProductListings } from './ProductListings';
const id = '00000000-0000-4000-8000-000000000001';
const business = businessSchema.parse({
  id,
  name: 'Business',
  state: 'active',
  role: 'custom',
  permissions: ['products.read', 'products.write'],
  version: 1,
});
const product = productSchema.parse({
  id,
  name: 'Coffee',
  sku: 'COFFEE',
  description: '',
  images: [],
  categoryId: null,
  state: 'active',
  type: 'physical',
  createdAt: '2026-10-01T00:00:00.000Z',
  trackInventory: true,
  version: 3,
  variants: [],
  barcodes: [],
  alternativeCodes: [],
});
afterEach(cleanup);
it('uses the existing versioned edit contract to change product availability', async () => {
  const request = vi.fn().mockResolvedValue({ ...product, state: 'inactive', version: 4 });
  const saved = vi.fn();
  render(
    <ProductListings
      business={business}
      product={product}
      locations={[]}
      client={createCatalogClient(request, id)}
      busy={false}
      run={(work) => {
        void work();
      }}
      onSaved={saved}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Deactivate product' }));
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith(expect.objectContaining({ state: 'inactive', version: 4 })),
  );
  expect(request).toHaveBeenCalledWith(
    `/${id}/products/${id}`,
    'PATCH',
    expect.objectContaining({ version: 3, name: 'Coffee', state: 'inactive' }),
  );
});
it('hides activation for readers and store-scoped editors', () => {
  const props = {
    product,
    locations: [],
    client: createCatalogClient(vi.fn(), id),
    busy: false,
    run: vi.fn(),
    onSaved: vi.fn(),
  };
  const { rerender } = render(
    <ProductListings {...props} business={{ ...business, permissions: ['products.read'] }} />,
  );
  expect(screen.queryByRole('button', { name: 'Deactivate product' })).toBeNull();
  rerender(
    <ProductListings
      {...props}
      business={{ ...business, scope: { storeId: id, warehouseId: null } }}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Deactivate product' })).toBeNull();
});
