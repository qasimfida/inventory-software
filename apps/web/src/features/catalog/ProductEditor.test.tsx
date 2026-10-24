// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createCatalogClient } from '@inventory/api-client';
import { ProductEditor } from './ProductEditor';
afterEach(cleanup);
it('retains product fields after a failed save and never advances to pricing', async () => {
  const request = vi.fn().mockRejectedValue(new Error('network unavailable'));
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
  await userEvent.click(screen.getByRole('button', { name: 'Save and set price' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText<HTMLInputElement>('Product name').value).toBe('New mug');
  expect(screen.getByLabelText<HTMLInputElement>('SKU').value).toBe('NEW-MUG');
  expect(request).toHaveBeenCalledTimes(1);
  expect(saved).not.toHaveBeenCalled();
});
