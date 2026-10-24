// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createCatalogClient } from '@inventory/api-client';
vi.mock('react-native', () => vi.importActual('react-native-web'));
import { ProductForm } from './ProductForm';
afterEach(cleanup);
it('creates a catalog item through native inputs without quantity editing', async () => {
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
      expect.objectContaining({ name: 'Shirt', sku: 'SHIRT' }),
    ),
  );
});
