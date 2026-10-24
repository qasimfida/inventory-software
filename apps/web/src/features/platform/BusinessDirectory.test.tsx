// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { authClient } from '@/platform/auth-client';
import { BusinessDirectory } from './BusinessDirectory';
const business = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Example business',
  state: 'active' as const,
  timeZone: 'UTC',
  createdAt: '2026-10-22T00:00:00.000Z',
};
const location = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Main warehouse',
  code: 'MAIN',
  state: 'active',
  kind: 'warehouses',
  type: 'warehouse',
  storeId: '33333333-3333-4333-8333-333333333333',
  warehouseId: null,
  version: 1,
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('loads nested locations only on expansion and presents actual details in a drawer', async () => {
  const request = vi
    .spyOn(authClient, 'accountRequest')
    .mockResolvedValue({ business, locations: [location], offset: 0, hasMore: false });
  render(<BusinessDirectory items={[business]} grid={false} />);
  expect(request).not.toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole('button', { name: 'Show locations for Example business' }),
  );
  const nested = await screen.findByRole('region', { name: 'Locations for Example business' });
  expect(within(nested).getByRole('table')).toBeTruthy();
  await userEvent.click(await screen.findByRole('button', { name: 'Main warehouse' }));
  expect(screen.getByRole('dialog').textContent).toContain('MAIN');
  expect(screen.getByRole('dialog').getAttribute('data-vaul-drawer')).not.toBeNull();
  await userEvent.keyboard('{Escape}');
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  await userEvent.click(
    screen.getByRole('button', { name: 'Hide locations for Example business' }),
  );
  expect(screen.queryByText('Main warehouse')).toBeNull();
  expect(request).toHaveBeenCalledTimes(1);
});
it('opens business details with its locations in a drawer, without mutations', async () => {
  const request = vi
    .spyOn(authClient, 'accountRequest')
    .mockResolvedValue({ business, locations: [location], offset: 0, hasMore: false });
  render(<BusinessDirectory items={[business]} grid />);
  await userEvent.click(screen.getByRole('button', { name: 'Example business' }));
  expect(screen.getByRole('dialog').textContent).toContain('2026-10-22T00:00:00.000Z');
  await screen.findByRole('button', { name: 'Main warehouse' });
  expect(within(screen.getByRole('dialog')).queryByRole('table')).toBeNull();
  expect(
    within(screen.getByRole('region', { name: 'Warehouses' })).getByRole('listitem').textContent,
  ).toContain('MAIN');
  expect(request).toHaveBeenCalledWith(
    expect.stringContaining(business.id),
    'GET',
    undefined,
    expect.any(AbortSignal),
  );
});

it('groups branch cards separately from warehouses and opens their details', async () => {
  const branch = {
    ...location,
    id: '44444444-4444-4444-8444-444444444444',
    name: 'North branch',
    kind: 'stores',
    type: 'branch',
    storeId: null,
  };
  vi.spyOn(authClient, 'accountRequest').mockResolvedValue({
    business,
    locations: [branch, location],
    offset: 0,
    hasMore: false,
  });
  render(<BusinessDirectory items={[business]} grid />);
  await userEvent.click(screen.getByRole('button', { name: 'View locations' }));
  const stores = await screen.findByRole('region', { name: 'Stores and branches' });
  expect(stores.textContent).toContain('Branch');
  expect(stores.textContent).not.toContain('Main warehouse');
  await userEvent.click(within(stores).getByRole('button', { name: 'North branch' }));
  expect(screen.getByRole('dialog', { name: 'Location details' }).textContent).toContain(
    'North branch',
  );
});
