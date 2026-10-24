// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultPreferences } from '@inventory/contracts';
vi.mock('@/theme/Appearance', () => ({
  useAppearance: () => ({ preferences: { ...defaultPreferences, states: 'enhanced' } }),
}));
import { CatalogProducts } from './CatalogProducts';
afterEach(cleanup);
it('offers creation only for a genuinely empty writable catalog', async () => {
  const create = vi.fn(),
    props = { products: [], onCreate: create, onPricing: vi.fn(), onEdit: vi.fn() };
  const view = render(<CatalogProducts {...props} writable filtered={false} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add product' }));
  expect(create).toHaveBeenCalledOnce();
  view.rerender(<CatalogProducts {...props} writable filtered />);
  expect(screen.getByText('No matching products')).toBeTruthy();
  expect(
    screen.getByText('Try another search or clear your filters to see more products.'),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Add product' })).toBeNull();
  view.rerender(<CatalogProducts {...props} writable={false} />);
  expect(screen.queryByRole('button', { name: 'Add product' })).toBeNull();
});
