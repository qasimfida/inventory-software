// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WarehouseSelect } from './WarehouseSelect';
afterEach(cleanup);
it('opens options directly and preserves selection callbacks', async () => {
  const change = vi.fn();
  render(
    <WarehouseSelect label="Checkout warehouse" value="a" onChange={change}>
      <option value="a">Main</option>
      <option value="b">Branch</option>
    </WarehouseSelect>,
  );
  await userEvent.click(screen.getByRole('combobox', { name: 'Checkout warehouse' }));
  await userEvent.click(screen.getByRole('option', { name: 'Branch' }));
  expect(change).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('option', { name: 'Branch' })).toBeNull();
});
