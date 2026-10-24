// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createSettingsClient, SettingsModel } from '@inventory/api-client';
const fixture = vi.hoisted(() => ({ account: vi.fn(), business: vi.fn() }));
vi.mock('@/platform/auth-client', () => ({
  authClient: { accountRequest: fixture.account, organizationRequest: fixture.business },
}));
vi.mock('../foundation/ConnectionPanel', () => ({ ConnectionPanel: () => <p>Readiness</p> }));
import { settingsModel } from '@/platform/settings';
import { SettingsPanel } from './SettingsPanel';
import { AppearanceProvider } from '@/theme/Appearance';
const policy = {
  version: 1,
  values: { defaults: {}, enforced: { appearance: 'light' }, notifications: {} },
};
const snapshot = {
  preferences: { version: 1, values: { appearance: 'dark' } },
  platform: policy,
  canManagePlatform: false,
  connectivity: { online: true, offlineCash: 'bounded-grant', localNetwork: 'deployment-required' },
};
afterEach(async () => {
  cleanup();
  await settingsModel.connect(null);
  vi.resetAllMocks();
});
it('opens preference popup controls immediately without exposing connectivity settings', async () => {
  fixture.account.mockResolvedValue(snapshot);
  await settingsModel.connect('account');
  const { container } = render(
    <AppearanceProvider>
      <SettingsPanel preferencesOnly />
    </AppearanceProvider>,
  );
  expect(container.querySelector('[data-state="open"]')).not.toBeNull();
  expect(screen.getByRole('radio', { name: 'circle' })).toBeDefined();
  expect(screen.getByRole('radio', { name: 'scroll' })).toBeDefined();
  expect(screen.queryByText('Readiness')).toBeNull();
});
it('labels enforced settings, persists account choices and applies accessibility constraints', async () => {
  fixture.account.mockResolvedValue(snapshot);
  await settingsModel.connect('account');
  render(
    <AppearanceProvider>
      <SettingsPanel />
    </AppearanceProvider>,
  );
  await userEvent.click(screen.getByText('Settings, connectivity and security'));
  expect(
    screen.getByRole('group', { name: 'Account appearance (enforced)' }).hasAttribute('disabled'),
  ).toBe(true);
  expect(document.documentElement.dataset.theme).toBe('light');
  expect(screen.queryByText('Platform policy')).toBeNull();
  fixture.account.mockImplementation(async (path: string, method?: string) =>
    path === 'settings' && method === 'PUT'
      ? { version: 2, values: { textSize: 'large' } }
      : snapshot,
  );
  await userEvent.click(
    screen.getByRole('group', { name: 'Text size' }).querySelector('input[value=large]')!,
  );
  await waitFor(() =>
    expect(fixture.account).toHaveBeenCalledWith(
      'settings',
      'PUT',
      expect.objectContaining({ version: 1, values: { appearance: 'dark', textSize: 'large' } }),
    ),
  );
});
it('loads only the selected account rather than accepting a user id in a settings mutation', async () => {
  const account = vi.fn().mockResolvedValue(snapshot);
  const model = new SettingsModel(createSettingsClient(account, vi.fn()));
  await model.connect('account');
  await model.save({ appearance: 'dark' });
  expect(account).toHaveBeenCalledWith('settings', 'PUT', {
    version: 1,
    values: { appearance: 'dark' },
  });
});
