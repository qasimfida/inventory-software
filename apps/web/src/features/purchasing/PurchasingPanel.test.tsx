// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
import { readCommerce } from '../../../../../packages/api-client/src/mock/read-commerce';
import { readInventory } from '../../../../../packages/api-client/src/mock/read-inventory';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
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
it('keeps creation and supplier editing beside their collection and preserves supplier selection', async () => {
  setup('owner');
  await screen.findByRole('button', { name: 'Create purchase order' });
  expect(screen.queryByRole('button', { name: /^Save supplier / })).toBeNull();
  const suppliers = screen.getByRole('tabpanel', { name: 'suppliers list view' });
  await userEvent.click(within(suppliers).getByRole('button', { name: seed.suppliers[0]!.name }));
  await screen.findByRole('button', {
    name: `Save supplier ${seed.suppliers[0]!.code}`,
  });
  expect(screen.getByLabelText('Supplier details').textContent).toContain(seed.suppliers[0]!.email);
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});
it('does not expose purchasing commands for a read-only role', async () => {
  setup('viewer');
  await screen.findByRole('tabpanel', { name: 'purchase orders list view' });
  expect(screen.queryByRole('button', { name: 'Create purchase order' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Create supplier' })).toBeNull();
});
