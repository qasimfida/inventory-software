// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
vi.hoisted(() => vi.stubGlobal('__DEV__', false));
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => vi.importActual('react-native-web'));
const fixture = vi.hoisted(() => ({ login: vi.fn().mockResolvedValue({ user: { id: 'demo' } }) }));
vi.mock('./client', () => ({ authClient: { login: fixture.login } }));
vi.mock('../shell/SessionContext', () => ({
  useAccount: () => ({
    session: null,
    busy: false,
    message: '',
    run: async (work: () => Promise<unknown>) => work(),
  }),
}));
vi.mock('../settings/ConnectionTools', () => ({ ConnectionTools: () => null }));
import { AuthPanel } from './AuthPanel';
afterEach(cleanup);
it('keeps native login separate from settings, business management and offline setup', () => {
  render(<AuthPanel navigate={vi.fn()} />);
  expect(screen.getByLabelText('Account email')).toBeTruthy();
  expect(screen.getByLabelText('Password')).toBeTruthy();
  expect(screen.getByText('Forgot password?')).toBeTruthy();
  expect(screen.queryByText('Business management')).toBeNull();
  expect(screen.queryByText('Offline cash register')).toBeNull();
});

it('clears pending link navigation after a successful sign-in', async () => {
  const navigate = vi.fn();
  render(<AuthPanel navigate={navigate} />);
  fireEvent.change(screen.getByLabelText('Account email'), {
    target: { value: 'owner@example.test' },
  });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'local-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('/dashboard'));
  expect(fixture.login).toHaveBeenCalledWith('owner@example.test', 'local-password');
});
