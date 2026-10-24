// @vitest-environment jsdom
import { useSyncExternalStore } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PosModel, createSalesClient } from '@inventory/api-client';
import { CartLines } from './CartLines';
const id = '00000000-0000-4000-8000-000000000001';
function fixture() {
  const request = vi.fn();
  const model = new PosModel(
    createSalesClient(request, () => id, id),
    id,
  );
  model.add({
    id,
    name: 'Desk mug',
    sku: 'MUG',
    unitId: id,
    units: [{ id, code: 'EA' }],
    images: ['https://example.com/mug.png'],
  });
  return { model, request };
}
function Lines({ model, canDiscount = true }: { model: PosModel; canDiscount?: boolean }) {
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  return <CartLines model={model} state={state} canDiscount={canDiscount} />;
}
afterEach(cleanup);
it('keeps quantity and percent discounts exact and moves stock location into details', async () => {
  const { model, request } = fixture();
  render(<Lines model={model} />);
  expect(screen.queryByLabelText(/Stock location ID/)).toBeNull();
  expect(screen.getByRole('img', { name: 'Desk mug' })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Increase Quantity 1' }));
  expect(model.snapshot().lines[0]?.quantity).toBe('2');
  await userEvent.click(screen.getByRole('button', { name: 'Discount for line 1' }));
  await userEvent.clear(screen.getByLabelText('Manual discount (%)'));
  await userEvent.type(screen.getByLabelText('Manual discount (%)'), '12.25');
  await userEvent.click(screen.getByRole('button', { name: 'Apply discount' }));
  expect(model.snapshot().lines[0]?.manualDiscountBasisPoints).toBe(1225);
  await userEvent.click(screen.getByRole('button', { name: 'View details for Desk mug' }));
  expect(screen.getByRole('dialog', { name: 'Product details' }).textContent).toContain('MUG');
  await userEvent.type(screen.getByLabelText(/Stock location ID/), id);
  expect(model.snapshot().lines[0]?.locationId).toBe(id);
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(request).not.toHaveBeenCalled();
});
it('hides discounts without permission and locks edits on uncertain checkout', () => {
  const { model } = fixture();
  render(
    <CartLines
      model={model}
      state={{ ...model.snapshot(), uncertain: true }}
      canDiscount={false}
    />,
  );
  expect(screen.queryByRole('button', { name: 'Discount for line 1' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Remove line 1' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByRole('button', { name: 'Increase Quantity 1' }).hasAttribute('disabled')).toBe(
    true,
  );
});

it('renders an empty cart without line controls', () => {
  const { model } = fixture();
  model.remove(0);
  render(<Lines model={model} />);
  expect(screen.getByText('Your cart is empty. Choose a product to start a sale.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Discount for line 1' })).toBeNull();
});
