// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
it('native settings label choices and prevent editing an enforced appearance', async () => {
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
  const radio = screen.getByRole('radio', { name: 'Appearance (enforced): dark' });
  expect(radio.getAttribute('aria-checked')).toBe('true');
  expect(radio.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(radio);
  expect(request).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Platform policy' })).toBeNull();
});
