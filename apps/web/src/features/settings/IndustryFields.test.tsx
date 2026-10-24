// @vitest-environment jsdom
import { selectOption } from '@/../test/select-option';
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PolicyEditor } from './PolicyEditor';
afterEach(cleanup);
it('allows intermediate invalid threshold edits without crashing other policy controls and prevents invalid saves', async () => {
  const user = userEvent.setup();
  render(
    <PolicyEditor
      policy={{ version: 0, values: { defaults: {}, enforced: {}, notifications: {} } }}
    />,
  );
  await user.click(screen.getByText('Business policy', { exact: true }));
  const threshold = screen.getByLabelText('Low-stock threshold (SKU base units)');
  await user.clear(threshold);
  await user.type(threshold, '-');
  expect(screen.getByRole('alert')).toBeTruthy();
  await selectOption(screen.getByLabelText('Business enforced: Appearance'), 'dark');
  expect(
    screen.getByRole<HTMLButtonElement>('button', { name: 'Save business policy' }).disabled,
  ).toBe(true);
  await user.clear(threshold);
  await user.type(threshold, '2.5');
  expect(screen.queryByRole('alert')).toBeNull();
  expect(
    screen.getByRole<HTMLButtonElement>('button', { name: 'Save business policy' }).disabled,
  ).toBe(false);
});
