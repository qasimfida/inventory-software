// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const request = vi.hoisted(() => vi.fn());
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { TradingPanel } from './TradingPanel';
const id = '00000000-0000-4000-8000-000000000001';
const business = {
  id,
  name: 'Test',
  role: 'owner' as const,
  state: 'active' as const,
  version: 1,
  timeZone: 'UTC',
};
const data = {
  relationships: [{ id, proposerId: id, partnerId: id, state: 'active', version: 1 }],
  orders: [
    {
      id,
      relationshipId: id,
      buyerId: id,
      sellerId: id,
      reference: 'ORDER-1',
      currency: 'USD',
      state: 'accepted',
      version: 2,
      createdAt: '2026-11-06T12:00:00Z',
      lines: [
        {
          description: 'Agreed item',
          quantity: '999999999999.123456',
          unit: 'case',
          unitPriceMinor: '999999999999999',
        },
      ],
    },
  ],
  offset: 0,
  hasMoreOrders: false,
  hasMoreRelationships: false,
};
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('opens exact shared terms and loads history only on demand without submitting commands', async () => {
  request.mockImplementation((path: string) =>
    Promise.resolve(
      path.includes('/history')
        ? {
            events: [
              {
                id: '1',
                businessId: id,
                state: 'accepted',
                note: 'Seller accepted terms',
                createdAt: '2026-11-06T12:00:00Z',
              },
            ],
            hasMore: false,
          }
        : data,
    ),
  );
  render(<TradingPanel business={business} />);
  await userEvent.click(await screen.findByRole('button', { name: 'ORDER-1' }));
  const lines = screen.getByRole('region', { name: 'Shared order lines' });
  expect(within(lines).getByText('999999999999.123456')).toBeTruthy();
  expect(within(lines).getByText('999999999999999')).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole('button', { name: 'Shared order history' }));
  expect(await screen.findByText('Seller accepted terms')).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls.every((call) => call.length === 1)).toBe(true);
});
it('provides safe read-only recovery after a failed load', async () => {
  request
    .mockRejectedValueOnce(new Error('private diagnostic'))
    .mockResolvedValue({ ...data, relationships: [], orders: [] });
  render(<TradingPanel business={business} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No trading relationships')).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('private diagnostic')).toBeNull();
});

it('recovers a failed history read and explains an empty history page', async () => {
  let attempts = 0;
  request.mockImplementation((path: string) => {
    if (!path.includes('/history')) return Promise.resolve(data);
    attempts++;
    return attempts === 1
      ? Promise.reject(new Error('private history error'))
      : Promise.resolve({ events: [], hasMore: false });
  });
  render(<TradingPanel business={business} />);
  await userEvent.click(await screen.findByRole('button', { name: 'ORDER-1' }));
  await userEvent.click(screen.getByRole('button', { name: 'Shared order history' }));
  await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('No shared order history on this page')).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(3);
});
