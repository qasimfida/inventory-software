// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createCatalogClient } from '@inventory/api-client';
import { ProductEditor } from './ProductEditor';
afterEach(cleanup);
it('retains product fields after a failed save and never advances to pricing', async () => {
  const request = vi.fn(async (path: string, method?: string) => {
    if (method === 'GET' && path.includes('sku-availability')) return { available: true };
    throw new Error('network unavailable');
  });
  const saved = vi.fn();
  render(
    <ProductEditor
      product={null}
      categories={[]}
      client={createCatalogClient(request, 'business')}
      onSaved={saved}
      onPricing={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  await userEvent.type(screen.getByLabelText('Product name'), 'New mug');
  await userEvent.type(screen.getByLabelText('SKU'), 'NEW-MUG');
  await userEvent.click(screen.getByRole('button', { name: 'Save details & continue' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText<HTMLInputElement>('Product name').value).toBe('New mug');
  expect(screen.getByLabelText<HTMLInputElement>('SKU').value).toBe('NEW-MUG');
  expect(request.mock.calls.filter((call) => call[1] === 'POST')).toHaveLength(1);
  expect(saved).not.toHaveBeenCalled();
});

it('flags a duplicate SKU before submission and clears it when the user changes the code', async () => {
  const request = vi.fn(async (path: string) => ({ available: !path.includes('sku=TAKEN') }));
  render(
    <ProductEditor
      product={null}
      categories={[]}
      client={createCatalogClient(request, 'business')}
      onSaved={vi.fn()}
      onPricing={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  await userEvent.type(screen.getByLabelText('SKU'), 'TAKEN');
  await screen.findByText('SKU ID already exists.');
  expect(screen.getByLabelText('SKU').getAttribute('aria-invalid')).toBe('true');
  expect(
    screen.getByRole<HTMLButtonElement>('button', { name: 'Save details & continue' }).disabled,
  ).toBe(true);
  await userEvent.clear(screen.getByLabelText('SKU'));
  await userEvent.type(screen.getByLabelText('SKU'), 'UNUSED');
  await screen.findByText('SKU is available.');
  expect(screen.queryByText('SKU ID already exists.')).toBeNull();
});
it('shows invalid fields beside the controls and a dismissible toast without losing input', async () => {
  const request = vi.fn();
  render(
    <ProductEditor
      product={null}
      categories={[]}
      client={createCatalogClient(request, 'business')}
      onSaved={vi.fn()}
      onPricing={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save details & continue' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Product name').getAttribute('aria-invalid')).toBe('true');
  expect(screen.getByLabelText('SKU').getAttribute('aria-describedby')).toBe('product-sku-error');
  await userEvent.click(screen.getByRole('button', { name: 'Dismiss error' }));
  expect(screen.queryByRole('alert')).toBeNull();
  expect(request).not.toHaveBeenCalled();
});
