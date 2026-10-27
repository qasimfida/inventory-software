vi.mock('../platform/operation-key', () => ({
  operationKey: () => 'd0000000-0000-4000-8000-000000009999',
}));
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../platform/useCatalogLive', () => ({ useCatalogLive: () => {} }));
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { readAdministration } from '../../../../packages/api-client/src/mock/read-administration';
import { StorefrontPanel } from './StorefrontPanel';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('native publication foundation shows readiness and opens local configuration without publishing', async () => {
  const seed = createDemoSeed(0, 'owner');
  request.mockResolvedValue(readAdministration(seed, 'storefront', false));
  render(<StorefrontPanel business={seed.business} locations={seed.locations} />);
  await screen.findByText('Image origin is not trusted');
  expect(screen.queryByRole('button', { name: 'publish listing' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Configure online store' }));
  await screen.findByText('Public store name');
  expect(request).toHaveBeenCalledTimes(1);
});
it('native managers see read-only publication status and transient refresh failures retain the snapshot', async () => {
  const seed = createDemoSeed(0, 'manager');
  request
    .mockResolvedValueOnce(readAdministration(seed, 'storefront', false))
    .mockRejectedValue(new Error('offline'));
  render(<StorefrontPanel business={seed.business} locations={seed.locations} />);
  await screen.findByText('Image origin is not trusted');
  expect(screen.queryByRole('button', { name: 'Configure online store' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Refresh readiness' }));
  await screen.findByText(/Last loaded data is read-only/);
  expect(screen.getByText('Image origin is not trusted')).toBeTruthy();
});
