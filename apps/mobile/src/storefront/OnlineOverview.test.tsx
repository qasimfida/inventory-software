// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
vi.mock('../platform/useCatalogLive', () => ({ useCatalogLive: () => {} }));
vi.mock('../shell/Navigation', () => ({ useNavigation: () => ({ navigate: vi.fn() }) }));
vi.mock('../auth/client', () => ({
  authClient: {
    organizationRequest: async (path: string) =>
      path.endsWith('/overview')
        ? {
            status: 'configured',
            counts: { selected: 0, active: 1, paused: 1, ready: 3, needs_changes: 2 },
            soldOut: 1,
            warnings: 1,
            asOf: '2026-10-25T12:00:00Z',
            lastValidatedAt: null,
          }
        : { settings: null, defaults: {}, prerequisites: [] },
  },
}));
import { businessSchema } from '@inventory/contracts';
import { OnlineOverview } from './OnlineOverview';
afterEach(cleanup);
it('native overview exposes attention destinations and keeps manager access read-only', async () => {
  const business = businessSchema.parse({
    id: 'd0000000-0000-4000-8000-000000000001',
    name: 'Store',
    state: 'active',
    role: 'manager',
    version: 1,
  });
  render(<OnlineOverview business={business} storeId="d0000000-0000-4000-8000-000000000002" />);
  expect(await screen.findByText('Store status: Configured, not live')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Active (2)' })).toBeTruthy();
  expect(screen.getByRole('button', { name: /Products needing changes \(2\)/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Re-check all' })).toBeNull();
});
