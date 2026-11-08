// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Business } from '@inventory/contracts';
const request = vi.hoisted(() => vi.fn());
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { SetupChecklist } from './SetupChecklist';
const business = {
  id: 'business',
  role: 'owner',
  state: 'active',
  permissions: ['business.write', 'products.write', 'locations.write', 'stock.write'],
} as unknown as Business;
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('uses server flags for completion and keeps authorized destinations', async () => {
  request.mockResolvedValue({
    dismissed: false,
    profile: true,
    currency: true,
    tax: true,
    locations: false,
    product: false,
    stock: false,
  });
  render(
    <MemoryRouter>
      <SetupChecklist business={business} />
    </MemoryRouter>,
  );
  expect(await screen.findByText('3 of 6 complete')).toBeDefined();
  expect(
    screen.getByRole('link', { name: 'Business profile · Complete' }).getAttribute('href'),
  ).toBe('/settings/company');
  expect(
    screen.getByRole('link', { name: 'First product · Needs attention' }).getAttribute('href'),
  ).toBe('/inventory');
});
it('does not request setup data for a store-scoped member', () => {
  render(
    <MemoryRouter>
      <SetupChecklist business={{ ...business, scope: { storeId: 'store', warehouseId: null } }} />
    </MemoryRouter>,
  );
  expect(request).not.toHaveBeenCalled();
  expect(screen.queryByRole('navigation')).toBeNull();
});
