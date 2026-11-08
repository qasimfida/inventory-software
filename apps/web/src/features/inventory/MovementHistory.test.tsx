// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { stockWorkspaceSchema } from '@inventory/contracts';
import { MovementHistory } from './MovementHistory';
afterEach(cleanup);
const id = '00000000-0000-4000-8000-000000000001';
const stock = stockWorkspaceSchema.parse({
  totals: { items: 0, balances: 0, reservations: 0 },
  limit: 25,
  offset: 0,
  hasMore: false,
  items: [],
  units: [],
  locations: [],
  balances: [],
  reservations: [],
  nextCursor: null,
  policy: { allowNegative: false, version: 1 },
  movements: [
    {
      id,
      variantId: id,
      warehouseId: id,
      locationId: id,
      actorId: id,
      sourceId: id,
      type: 'adjustment_out',
      sourceKind: 'manual',
      quantityDelta: '-1.000001',
      reservedDelta: '0',
      damagedDelta: '0',
      transitDelta: '0',
      reason: 'Packaging damaged',
      reversalOf: null,
      createdAt: '2026-11-06T12:00:00Z',
    },
  ],
});
it('shows exact movement values and opens all loaded evidence with keyboard, without a request', async () => {
  render(<MovementHistory stock={stock} timeZone="UTC" />);
  expect(screen.getByRole('table').textContent).toContain('-1.000001');
  const trigger = within(screen.getByRole('table')).getByRole('button');
  trigger.focus();
  await userEvent.keyboard('{Enter}');
  const drawer = screen.getByRole('dialog', { name: 'Stock movement' });
  expect(drawer.textContent).toContain('Packaging damaged');
  expect(drawer.textContent).toContain('Actor reference');
  expect(drawer.textContent).toContain(`manual/${id}`);
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});
it('provides an explicit empty ledger state', () => {
  render(<MovementHistory stock={{ ...stock, movements: [] }} timeZone="UTC" />);
  expect(screen.getByText('No stock movements')).toBeTruthy();
  expect(screen.queryByRole('table')).toBeNull();
});
