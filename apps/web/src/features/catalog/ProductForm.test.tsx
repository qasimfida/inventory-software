// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createCatalogClient } from '@inventory/api-client';
import { ProductForm } from './ProductForm';
afterEach(cleanup);
it('submits descriptive catalog data with labelled controls and no on-hand quantity field', async () => {
  const request = vi.fn().mockResolvedValue({
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Shirt',
    sku: 'SHIRT',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
  });
  render(
    <ProductForm
      product={null}
      categories={[]}
      client={createCatalogClient(request, 'business')}
      run={(work) => void work()}
      cancel={() => {}}
    />,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Product name'), 'Shirt');
  await user.type(screen.getByLabelText('SKU'), 'shirt');
  expect(screen.queryByLabelText(/on.hand quantity/i)).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Save product' }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      '/business/products',
      'POST',
      expect.objectContaining({ name: 'Shirt', sku: 'SHIRT', trackInventory: true }),
    ),
  );
});
it('preserves product codes when their section is collapsed before saving', async () => {
  const request = vi.fn().mockResolvedValue({
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Mug',
    sku: 'MUG',
    version: 1,
    createdAt: '2026-01-01T00:00:00Z',
  });
  render(
    <ProductForm
      product={null}
      categories={[]}
      client={createCatalogClient(request, 'business')}
      run={(work) => void work()}
      cancel={() => {}}
    />,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Product name'), 'Mug');
  await user.type(screen.getByLabelText('SKU'), 'MUG');
  const disclosure = screen.getByRole('button', { name: 'Images and product codes' });
  await user.click(disclosure);
  await user.type(screen.getByLabelText(/Barcodes/), '1234567890123');
  await user.click(disclosure);
  await user.click(screen.getByRole('button', { name: 'Save product' }));
  await waitFor(() =>
    expect(request).toHaveBeenCalledWith(
      '/business/products',
      'POST',
      expect.objectContaining({ barcodes: ['1234567890123'], trackInventory: true }),
    ),
  );
});
