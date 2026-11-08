// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { readCommerce } from '../../../../packages/api-client/src/mock/read-commerce';
import { readInventory } from '../../../../packages/api-client/src/mock/read-inventory';
import userEvent from '@testing-library/user-event';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
import { TransferPanel } from './TransferPanel';
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
  render(<TransferPanel business={{ ...seed.business, role }} locations={seed.locations} />);
}
it('opens authorized transfer evidence without exposing writes to a viewer', async () => {
  setup('viewer');
  await userEvent.click(await screen.findByRole('button', { name: 'TR-200' }));
  await screen.findByText('No receipts recorded');
  expect(screen.queryByRole('button', { name: 'Create transfer draft' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'approve transfer TR-200' })).toBeNull();
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});
it('keeps draft line and transition commands distinct for writers', async () => {
  setup('owner');
  await screen.findByRole('button', { name: 'Create transfer draft' });
  await userEvent.click(await screen.findByRole('button', { name: 'TR-200' }));
  await screen.findByRole('button', { name: 'Add draft transfer line' });
  expect(screen.getByRole('button', { name: 'approve transfer TR-200' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'cancel transfer TR-200' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Confirm destination receipt' })).toBeNull();
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});

it('places export and authorized creation alongside the scoped selector', async () => {
  setup('owner');
  const create = await screen.findByRole('button', { name: 'Create transfer draft' });
  expect(screen.getByRole('button', { name: 'Transfer store' })).toBeTruthy();
  expect(create).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Export shown records' })).toBeTruthy();
});
