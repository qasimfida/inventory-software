// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const resetPassword = vi.hoisted(() => vi.fn());
vi.mock('@/platform/auth-client', () => ({ authClient: { resetPassword } }));
import { PasswordRecovery } from './PasswordRecovery';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('submits a recovery code, clears secrets and reports confirmation without logging in', async () => {
  resetPassword.mockResolvedValue(undefined);
  render(<PasswordRecovery />);
  const user = userEvent.setup();
  await user.click(screen.getByText('Forgot password / recovery code'));
  await user.type(screen.getByLabelText('Recovery account email'), 'staff@example.test');
  const code = screen.getByLabelText<HTMLInputElement>('Recovery code');
  const password = screen.getByLabelText<HTMLInputElement>('New password (15–128 characters)');
  await user.type(code, 'a'.repeat(43));
  await user.type(password, 'a new secure passphrase');
  await user.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(resetPassword).toHaveBeenCalledWith(
    'staff@example.test',
    'a new secure passphrase',
    'a'.repeat(43),
  );
  await screen.findByText(/Password reset. All online sessions ended/);
  expect(code.value).toBe('');
  expect(password.value).toBe('');
});
