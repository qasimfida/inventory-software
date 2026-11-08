// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { readCommerce } from '../../../../packages/api-client/src/mock/read-commerce';
import { readInventory } from '../../../../packages/api-client/src/mock/read-inventory';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { PurchasingPanel } from './PurchasingPanel';
const seed = createDemoSeed(0, 'owner');
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function setup(role: 'owner' | 'viewer') {
  request.mockImplementation(async (path: string) => {
    const url = new URL(path, 'http://localhost');
    const resource = url.pathname.split('/').slice(2).join('/');
    return resource === 'stock'
      ? readInventory(seed, resource, url.searchParams, false)
      : readCommerce(seed, resource, url.searchParams, false);
  });
  render(<PurchasingPanel business={{ ...seed.business, role }} locations={seed.locations} />);
}
it('keeps native purchasing read-only for viewers', async () => {
  setup('viewer');
  await screen.findAllByText('PO-2026-1000');
  expect(screen.queryByRole('button', { name: 'Create purchase order' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Create supplier' })).toBeNull();
});
