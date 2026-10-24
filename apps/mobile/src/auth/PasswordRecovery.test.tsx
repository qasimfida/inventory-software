// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
const resetPassword = vi.hoisted(() => vi.fn());
vi.mock('./client', () => ({ authClient: { resetPassword } }));
import { PasswordRecovery } from './PasswordRecovery';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('native recovery masks and clears secrets and preserves an unconfirmed outcome', async () => {
  resetPassword.mockRejectedValue(new Error('lost response'));
  render(<PasswordRecovery />);
  await userEvent.click(screen.getByRole('button', { name: 'Forgot password / recovery code' }));
  fireEvent.change(screen.getByLabelText('Recovery account email'), {
    target: { value: 'staff@example.test' },
  });
  const code = screen.getByLabelText<HTMLInputElement>('Recovery code');
  const password = screen.getByLabelText<HTMLInputElement>('New password (15–128 characters)');
  expect(code.type).toBe('password');
  fireEvent.change(code, { target: { value: 'a'.repeat(43) } });
  fireEvent.change(password, { target: { value: 'a new secure passphrase' } });
  await userEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  await screen.findByText(/Reset was not confirmed/);
  expect(resetPassword).toHaveBeenCalledTimes(1);
  expect(code.value).toBe('');
  expect(password.value).toBe('');
});
