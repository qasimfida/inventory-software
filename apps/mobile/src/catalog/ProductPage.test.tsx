// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
vi.mock('../platform/useCatalogLive', () => ({ useCatalogLive: () => {} }));
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
vi.mock('./ManageProduct', () => ({ ManageProduct: () => null }));
vi.mock('../pricing/PricingPanel', () => ({ PricingPanel: () => null }));
import { productSchema } from '@inventory/contracts';
import { ProductPage } from './ProductPage';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const id = '00000000-0000-4000-8000-000000000001';
it('native detail exposes five tabs, denied stock and channel access without business mutations', async () => {
  request.mockResolvedValue(
    productSchema.parse({
      id,
      name: 'Test product',
      sku: 'TEST',
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
  );
  render(
    <ProductPage
      business={{
        id,
        name: 'Demo',
        role: 'custom',
        permissions: ['products.read'],
        state: 'active',
        version: 1,
      }}
      locations={[]}
      productId={id}
    />,
  );
  await screen.findByText('Test product');
  expect(screen.getAllByRole('tab')).toHaveLength(5);
  expect(screen.queryByText('Edit product details')).toBeNull();
  fireEvent.click(screen.getByRole('tab', { name: 'Stock' }));
  expect(screen.getByText('Stock viewing permission is required.')).toBeTruthy();
  fireEvent.click(screen.getByRole('tab', { name: 'Channels' }));
  expect(screen.getByText(/Online store viewing permission is required/)).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith(`/${id}/products/${id}`);
});
it('native read failure offers retry and then renders real returned product', async () => {
  request.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue(
    productSchema.parse({
      id,
      name: 'Recovered product',
      sku: 'TEST',
      version: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
    }),
  );
  render(
    <ProductPage
      business={{ id, name: 'Demo', role: 'owner', state: 'active', version: 1 }}
      locations={[]}
      productId={id}
    />,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Retry product' }));
  await screen.findByText('Recovered product');
  expect(request).toHaveBeenCalledTimes(2);
});
