// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
const request = vi.hoisted(() => vi.fn());
vi.mock('../auth/client', () => ({
  authClient: { accountRequest: request, organizationRequest: request },
}));
import { settingsModel } from './model';
import { SettingsPanel } from './SettingsPanel';
afterEach(async () => {
  cleanup();
  await settingsModel.connect(null);
  vi.resetAllMocks();
});
it('native settings retire cosmetic enforcement while preserving platform-policy authorization', async () => {
  request.mockResolvedValue({
    preferences: { version: 0, values: {} },
    platform: {
      version: 1,
      values: { defaults: {}, enforced: { appearance: 'dark' }, notifications: {} },
    },
    canManagePlatform: false,
    connectivity: {
      online: true,
      offlineCash: 'bounded-grant',
      localNetwork: 'deployment-required',
    },
  });
  await settingsModel.connect('account');
  render(<SettingsPanel />);
  await userEvent.click(
    screen.getByRole('button', { name: 'Settings, connectivity and security' }),
  );
  expect(screen.getByRole('heading', { name: 'Basic' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Advanced · Style & typography' })).toBeDefined();
  const radio = screen.getByRole('radio', { name: 'Appearance: dark' });
  expect(radio.getAttribute('aria-checked')).toBe('false');
  expect(radio.getAttribute('aria-disabled')).not.toBe('true');
  await userEvent.click(radio);
  await waitFor(() => expect(request.mock.calls.some((call) => call[1] === 'PUT')).toBe(true));
  expect(screen.queryByRole('button', { name: 'Platform policy' })).toBeNull();
});
