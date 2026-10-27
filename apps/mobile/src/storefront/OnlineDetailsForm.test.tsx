// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { OnlineDetailsForm } from './OnlineDetailsForm';
import { createOnlineStoreClient } from '@inventory/api-client';
import { onlineProductPreviewSchema, onlineOverridesSchema } from '@inventory/contracts';
const id = '00000000-0000-4000-8000-000000000001';
const source = {
  exists: true,
  state: 'active',
  title: 'Product title',
  description: 'A full product description.',
  images: [],
  allowedHosts: ['images.example.com'],
  category: true,
  currency: 'USD',
  variants: [
    {
      id,
      sku: 'SKU',
      unit: 'EA',
      complete: true,
      priceMinor: '2500',
      currency: 'USD',
      posPriceMinor: null,
    },
  ],
  hasStockSource: true,
  soldOut: false,
  lowStock: false,
};
const preview = onlineProductPreviewSchema.parse({
  productId: id,
  listingId: id,
  title: source.title,
  source,
  inherited: source,
  quantity: '12',
  issues: [],
  images: [],
  soldOutBehavior: 'show',
});
const value = onlineOverridesSchema.parse({
  title: null,
  description: null,
  images: null,
  price: null,
  visible: true,
});
const client = createOnlineStoreClient(async () => ({}), id, id);
afterEach(cleanup);
it('native online editor exposes inherited fields, price toggle and live readiness without internal fields', () => {
  const change = vi.fn();
  render(
    <OnlineDetailsForm
      preview={preview}
      value={value}
      onChange={change}
      disabled={false}
      client={client}
    />,
  );
  expect(screen.getByRole('textbox', { name: 'Online title (Inherited)' })).toBeTruthy();
  fireEvent.click(screen.getByRole('switch', { name: 'Use an online price override' }));
  expect(change.mock.calls[0]?.[0].price.currency).toBe('USD');
  expect(screen.queryByText(/cost|supplier/i)).toBeNull();
  expect(screen.getByText(/Add at least one allowed HTTPS product image/)).toBeTruthy();
});
it('native read-only editor disables changes and reset', () => {
  render(
    <OnlineDetailsForm
      preview={preview}
      value={value}
      onChange={() => {}}
      disabled
      client={client}
    />,
  );
  expect(
    screen.getByRole<HTMLInputElement>('textbox', { name: 'Online title (Inherited)' }).readOnly,
  ).toBe(true);
  expect(
    screen.getByRole('button', { name: 'Reset to product values' }).getAttribute('aria-disabled'),
  ).toBe('true');
});
