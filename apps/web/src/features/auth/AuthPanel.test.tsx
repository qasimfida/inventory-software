// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const mocks = vi.hoisted(() => ({
  current: vi.fn(),
  accept: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  renew: vi.fn(),
}));
vi.mock('@/platform/auth-client', () => ({ authClient: mocks }));
vi.mock('../organization/ManagementPanel', () => ({ ManagementPanel: () => null }));
import { AuthPanel } from './AuthPanel';
const session = {
  user: { id: 'user', email: 'user@example.test', status: 'active' },
  sessionId: 'session',
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  absoluteExpiresAt: new Date(Date.now() + 3600000).toISOString(),
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('signs in with labelled controls, clears submitted passwords and locks on connectivity loss', async () => {
  mocks.current.mockRejectedValue(new Error('offline'));
  mocks.login.mockResolvedValue(session);
  render(<AuthPanel />);
  await screen.findByRole('alert');
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Account email'), 'user@example.test');
  const password = screen.getByLabelText<HTMLInputElement>('Password');
  await user.type(password, 'correct horse battery staple');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  await screen.findByText('Signed in as user@example.test');
  expect(password.value).toBe('');
  window.dispatchEvent(new Event('offline'));
  await waitFor(() => expect(screen.queryByText('Signed in as user@example.test')).toBeNull());
});
it('logs out all sessions and does not retain an authenticated view', async () => {
  mocks.current.mockResolvedValue(session);
  mocks.logout.mockResolvedValue(undefined);
  render(<AuthPanel />);
  await screen.findByText('Signed in as user@example.test');
  await userEvent.click(screen.getByRole('button', { name: 'Log out all sessions' }));
  await screen.findByRole('button', { name: 'Log in' });
  expect(mocks.logout).toHaveBeenCalledWith(true);
});

it('returns to login after invitation onboarding and logout', async () => {
  mocks.current.mockRejectedValue(new Error('signed out'));
  mocks.accept.mockResolvedValue(session);
  mocks.logout.mockResolvedValue(undefined);
  render(<AuthPanel />);
  await screen.findByRole('alert');
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'I have an invitation' }));
  await user.type(screen.getByLabelText('Account email'), 'user@example.test');
  await user.type(
    screen.getByLabelText('Password (15–128 characters)'),
    'correct horse battery staple',
  );
  await user.type(screen.getByLabelText('Invitation code'), 'a'.repeat(43));
  await user.click(screen.getByRole('button', { name: 'Accept invitation' }));
  await screen.findByText('Signed in as user@example.test');
  await user.click(screen.getByRole('button', { name: 'Log out' }));
  await screen.findByRole('button', { name: 'Log in' });
});
