// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthenticationError } from '@inventory/api-client';
const mocks = vi.hoisted(() => ({
  current: vi.fn(),
  accept: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  renew: vi.fn(),
  list: vi.fn(),
}));
vi.mock('@/platform/auth-client', () => ({ authClient: mocks }));
vi.mock('@/platform/settings', () => ({ settingsModel: { connect: async () => undefined } }));
import { AuthPanel } from './AuthPanel';
import { AccountSessions } from './AccountSessions';
import { SessionProvider, useAccount } from '@/shell/SessionContext';
const session = {
  user: { id: 'user', email: 'user@example.test', status: 'active' },
  sessionId: 'session',
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  absoluteExpiresAt: new Date(Date.now() + 3600000).toISOString(),
};
function Dashboard() {
  const account = useAccount();
  return account.session ? (
    <>
      <h1>Dashboard</h1>
      <AccountSessions {...account} session={account.session} />
    </>
  ) : (
    <Navigate to="/auth/login" />
  );
}
function mount() {
  render(
    <MemoryRouter initialEntries={['/auth/login']}>
      <SessionProvider>
        <Routes>
          <Route path="/auth/:page" element={<AuthPanel />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('routes authenticated accounts to a separate dashboard without auth controls', async () => {
  mocks.current.mockResolvedValue(session);
  mount();
  await screen.findByRole('heading', { name: 'Dashboard' });
  expect(screen.queryByLabelText('Password')).toBeNull();
});
it('clears submitted passwords and preserves a bounded session on connectivity loss', async () => {
  mocks.current.mockRejectedValue(new Error('offline'));
  mocks.login.mockResolvedValue(session);
  mount();
  await screen.findByRole('alert');
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Account email'), 'user@example.test');
  const password = screen.getByLabelText<HTMLInputElement>('Password');
  await user.type(password, 'correct horse battery staple');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  await screen.findByRole('heading', { name: 'Dashboard' });
  expect(password.value).toBe('');
  window.dispatchEvent(new Event('offline'));
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy();
});
it('logs out all sessions and returns to isolated login', async () => {
  mocks.current.mockResolvedValue(session);
  mocks.logout.mockResolvedValue(undefined);
  mount();
  await screen.findByRole('heading', { name: 'Dashboard' });
  await userEvent.click(screen.getByRole('button', { name: 'Log out all sessions' }));
  await screen.findByRole('button', { name: 'Log in' });
  expect(mocks.logout).toHaveBeenCalledWith(true);
});
it('accepts an invitation then returns to login on logout', async () => {
  mocks.current.mockRejectedValue(new AuthenticationError(401));
  mocks.accept.mockResolvedValue(session);
  mocks.logout.mockResolvedValue(undefined);
  mount();
  const user = userEvent.setup();
  await waitFor(() =>
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Log in' }).disabled).toBe(false),
  );
  await user.click(screen.getByRole('link', { name: 'I have an invitation' }));
  await user.type(screen.getByLabelText('Account email'), 'user@example.test');
  await user.type(
    screen.getByLabelText('Password (15–128 characters)'),
    'correct horse battery staple',
  );
  await user.type(screen.getByLabelText('Invitation code'), 'a'.repeat(43));
  await user.click(screen.getByRole('button', { name: 'Accept invitation' }));
  await screen.findByRole('heading', { name: 'Dashboard' });
  await user.click(screen.getByRole('button', { name: /^Log out$/ }));
  await screen.findByRole('button', { name: 'Log in' });
});
it('treats a missing saved session normally but reports invalid login credentials', async () => {
  mocks.current.mockRejectedValue(new AuthenticationError(401));
  mocks.login.mockRejectedValue(new AuthenticationError(401));
  mount();
  await waitFor(() =>
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Log in' }).disabled).toBe(false),
  );
  expect(screen.queryByRole('alert')).toBeNull();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Account email'), 'user@example.test');
  await user.type(screen.getByLabelText('Password'), 'wrong password');
  await user.click(screen.getByRole('button', { name: 'Log in' }));
  expect((await screen.findByRole('alert')).textContent).toContain('Credentials may be invalid');
});
