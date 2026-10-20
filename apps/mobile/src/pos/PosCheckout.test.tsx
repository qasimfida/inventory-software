// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { businessSchema, locationSchema } from '@inventory/contracts';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('../catalog/BarcodeScanner', () => ({ BarcodeScanner: () => null }));
vi.mock('../platform/operation-key', () => ({
  operationKey: () => '00000000-0000-4000-8000-000000000003',
}));
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
import { PosCheckout } from './PosCheckout';
const id = '00000000-0000-4000-8000-000000000001';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('uses native labelled controls for search, cart, authoritative quote and confirmed cash checkout', async () => {
  const business = businessSchema.parse({
    id,
    name: 'Shop',
    state: 'active',
    role: 'cashier',
    version: 1,
  });
  const warehouse = locationSchema.parse({
    id,
    name: 'Warehouse',
    code: 'WH',
    state: 'active',
    kind: 'warehouses',
    type: 'warehouse',
    storeId: id,
    warehouseId: null,
    version: 1,
  });
  request.mockImplementation(async (path: string) => {
    if (path.includes('/pos/items'))
      return {
        items: [
          { id, name: 'Native item', sku: 'NATIVE', unitId: id, units: [{ id, code: 'EA' }] },
        ],
        hasMore: false,
        offset: 0,
      };
    if (path.includes('/customers')) return { customers: [], hasMore: false, offset: 0 };
    if (path.endsWith('/pos/quotes'))
      return {
        warehouseId: id,
        storeId: id,
        customerId: null,
        currency: 'USD',
        netMinor: '100',
        taxMinor: '0',
        totalMinor: '100',
        quoteFingerprint: 'a'.repeat(64),
        lines: [],
      };
    if (path.endsWith('/sales'))
      return {
        sale: {
          id,
          storeId: id,
          warehouseId: id,
          customerId: null,
          currency: 'USD',
          netMinor: '100',
          taxMinor: '0',
          totalMinor: '100',
          cashReceivedMinor: '100',
          changeMinor: '0',
          state: 'completed',
          actorId: id,
          createdAt: '2026-10-20T00:00:00.000Z',
        },
        lines: [],
        payments: [],
        receivableId: null,
        finance: {
          reconciled: true,
          outstandingMinor: '0',
          dueDate: null,
          returns: [],
          refunds: [],
          returnedLines: [],
        },
      };
    throw new Error('Unexpected request');
  });
  const user = userEvent.setup();
  render(<PosCheckout business={business} warehouse={warehouse} onLockChange={() => {}} />);
  await user.click(await screen.findByRole('button', { name: 'Add NATIVE · Native item' }));
  await user.click(screen.getByRole('button', { name: 'Calculate checkout total' }));
  await user.click(await screen.findByRole('button', { name: 'Complete cash / credit sale' }));
  await screen.findByText(/Sale completed:/);
  expect(request).toHaveBeenCalledWith(
    `/${id}/sales`,
    'POST',
    expect.objectContaining({
      cashAppliedMinor: '100',
      cashReceivedMinor: '100',
      idempotencyKey: '00000000-0000-4000-8000-000000000003',
    }),
  );
});
