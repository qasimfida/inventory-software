// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
const request = vi.hoisted(() => vi.fn());
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
import { readDashboard } from '../../../../packages/api-client/src/mock/read-dashboard';
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { NavigationProvider } from '../shell/Navigation';
import { Dashboard } from './Dashboard';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('renders native overview, real currency labels and exact daily values', async () => {
  const seed = createDemoSeed(0, 'owner');
  request.mockImplementation(async (path: string) =>
    readDashboard(seed, new URL(path, 'http://test.local').searchParams, false),
  );
  render(
    <NavigationProvider>
      <Dashboard business={seed.business} />
    </NavigationProvider>,
  );
  expect(await screen.findByText('Sales today')).toBeTruthy();
  expect(screen.getByText('Top products')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'View daily figures' })).toBeNull();
  expect(screen.getAllByRole('img', { name: /gross sales$/ })).toHaveLength(30);
  await userEvent.click(screen.getByRole('radio', { name: 'Overview period: Last 7 days' }));
  await waitFor(() => expect(screen.getAllByRole('img', { name: /gross sales$/ })).toHaveLength(7));
  await userEvent.click(screen.getByRole('radio', { name: 'Overview period: Last 30 days' }));
  await waitFor(() =>
    expect(screen.getAllByRole('img', { name: /gross sales$/ })).toHaveLength(30),
  );
  expect(screen.getByRole('button', { name: 'Overview recorded currency' })).toBeTruthy();
});

it.each(['viewer', 'custom'] as const)(
  'does not request financial overview for %s without report access',
  (role) => {
    const seed = createDemoSeed(0, 'owner');
    render(
      <NavigationProvider>
        <Dashboard business={{ ...seed.business, role, permissions: [] }} />
      </NavigationProvider>,
    );
    expect(screen.getByText('Your workspace is ready')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start working' })).toBeTruthy();
    expect(request).not.toHaveBeenCalled();
  },
);
