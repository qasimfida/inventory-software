// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { productSchema } from '@inventory/contracts';
import { CatalogProducts } from './CatalogProducts';

const product = productSchema.parse({
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Desk chair',
  sku: 'CHAIR',
  version: 1,
  createdAt: '2026-10-21T00:00:00Z',
  description: 'Test catalog record',
  barcodes: ['12345'],
});
afterEach(cleanup);
it('opens real product details with keyboard controls and preserves pricing and edit actions', async () => {
  const onPricing = vi.fn(),
    onEdit = vi.fn();
  render(<CatalogProducts products={[product]} writable onPricing={onPricing} onEdit={onEdit} />);
  const user = userEvent.setup();
  screen.getByRole('button', { name: 'View details for Desk chair' }).focus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('dialog', { name: 'Product detail' }).textContent).toContain('12345');
  await user.click(screen.getByRole('button', { name: 'Close Product detail' }));
  await user.click(screen.getByRole('button', { name: 'Variants and pricing for Desk chair' }));
  expect(onPricing).toHaveBeenCalledWith(product.id);
  await user.click(screen.getByRole('button', { name: 'Edit product Desk chair' }));
  expect(onEdit).toHaveBeenCalledWith(product);
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('hides edit controls for read-only access and clears details when search results change', async () => {
  const view = render(
    <CatalogProducts
      products={[product]}
      writable={false}
      onPricing={() => {}}
      onEdit={() => {}}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Edit product Desk chair' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'View details for Desk chair' }));
  view.rerender(
    <CatalogProducts products={[]} writable={false} onPricing={() => {}} onEdit={() => {}} />,
  );
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByText('No products yet')).toBeTruthy();
});

it('omits selection without a bulk command and preserves authorized row actions', async () => {
  const props = { products: [product], writable: true, onPricing: vi.fn(), onEdit: vi.fn() };
  const view = render(<CatalogProducts {...props} view="grid" />);
  expect(screen.queryByRole('checkbox')).toBeNull();
  view.rerender(<CatalogProducts {...props} view="list" />);
  expect(screen.queryByRole('checkbox')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Actions for CHAIR' }));
  await userEvent.click(screen.getByRole('menuitem', { name: 'Edit product' }));
  expect(props.onEdit).toHaveBeenCalledWith(product);
});
