// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryProducts } from './InventoryProducts';
afterEach(cleanup);
it('opens the same actual stock details from list and grid, and closes with Escape', async () => {
  const user = userEvent.setup();
  render(
    <InventoryProducts
      items={[
        { id: 'a', name: 'Widget', sku: 'W-1', unit: 'EA', available: '12.5', status: 'in-stock' },
      ]}
    />,
  );
  await user.click(screen.getByRole('button', { name: 'View Widget' }));
  expect(screen.getByRole('dialog').textContent).toContain('12.5');
  await user.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await user.click(screen.getByRole('tab', { name: 'Inventory grid view' }));
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'View Widget' }));
  expect(screen.getByRole('dialog').textContent).toContain('W-1');
});
