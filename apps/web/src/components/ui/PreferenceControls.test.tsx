// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreferenceControlsDemo } from '@/features/foundation/PreferenceControlsDemo';
afterEach(cleanup);
it('provides labelled keyboard switches and native radio navigation without submitting forms', async () => {
  render(<PreferenceControlsDemo />);
  const user = userEvent.setup(),
    control = screen.getByRole('switch', { name: 'Example effects' });
  control.focus();
  await user.keyboard(' ');
  expect(control.getAttribute('aria-checked')).toBe('true');
  expect(screen.getByRole<HTMLButtonElement>('switch', { name: 'Disabled switch' }).disabled).toBe(
    true,
  );
  const compact = screen.getByRole<HTMLInputElement>('radio', { name: 'compact' });
  compact.focus();
  await user.keyboard(' ');
  expect(compact.checked).toBe(true);
});
