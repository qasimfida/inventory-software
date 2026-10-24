// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InventoryControlsDemo } from '@/features/foundation/InventoryControlsDemo';
import { PasswordInput } from '@/features/auth/PasswordInput';
afterEach(cleanup);
it('shows search, supports suggestion selection with keys, clears and shows an honest empty state', async () => {
  const user = userEvent.setup();
  render(<InventoryControlsDemo />);
  const input = screen.getByRole<HTMLInputElement>('combobox', { name: 'Find example product' });
  expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  await user.type(input, 'sample');
  await user.keyboard('{ArrowDown}{Enter}');
  expect(input.value).toBe('SAMPLE-1');
  await user.clear(input);
  await user.type(input, 'missing');
  expect(screen.getByRole('status').textContent).toContain('No matching results');
  await user.click(screen.getByRole('button', { name: 'Clear search' }));
  expect(input.value).toBe('');
  expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
});
it('steps quantities and navigates bounded numbered pages without submitting forms', async () => {
  const user = userEvent.setup();
  render(<InventoryControlsDemo />);
  await user.click(screen.getByRole('button', { name: 'Increase Example quantity' }));
  expect(screen.getByLabelText<HTMLInputElement>('Example quantity').value).toBe('2');
  await user.click(screen.getByRole('button', { name: 'Page 16' }));
  expect(screen.getByRole('button', { name: 'Page 16' }).getAttribute('aria-current')).toBe('page');
  expect(
    screen.getByRole<HTMLButtonElement>('button', { name: 'Next example products' }).disabled,
  ).toBe(true);
});
it('reveals a password in its own field without submitting or discarding it', async () => {
  const user = userEvent.setup();
  render(<PasswordInput aria-label="Password" defaultValue="example password" />);
  const input = screen.getByLabelText<HTMLInputElement>('Password');
  await user.click(screen.getByRole('button', { name: 'Show password' }));
  expect(input.type).toBe('text');
  await user.click(screen.getByRole('button', { name: 'Hide password' }));
  expect(input.type).toBe('password');
  expect(input.value).toBe('example password');
});
