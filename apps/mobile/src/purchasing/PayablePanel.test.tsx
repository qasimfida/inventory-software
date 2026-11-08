import { formatMinorUnits } from '@inventory/domain';
import userEvent from '@testing-library/user-event';
// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { readCommerce } from '../../../../packages/api-client/src/mock/read-commerce';
const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
import { PayablePanel } from './PayablePanel';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('opens the selected invoice with exact balances and hides settlements from read-only staff', async () => {
  const seed = createDemoSeed(0, 'owner');
  request.mockImplementation(async (path: string) => {
    const url = new URL(path, 'http://localhost');
    return readCommerce(seed, url.pathname.split('/').slice(2).join('/'), url.searchParams, false);
  });
  render(
    <PayablePanel business={{ ...seed.business, role: 'viewer' }} locations={seed.locations} />,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'View invoice INV-1048' }));
  await screen.findByText('Settlement and credit history');
  expect(
    screen.getAllByText(
      formatMinorUnits(
        seed.payables[0]!.invoice.outstandingMinor,
        seed.payables[0]!.invoice.currency,
      ),
    ).length,
  ).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: 'Record supplier cash payment' })).toBeNull();
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});

it('retries failed reads without submitting financial commands', async () => {
  const seed = createDemoSeed(0, 'owner');
  request.mockRejectedValue(new Error('Connection unavailable'));
  render(<PayablePanel business={seed.business} locations={seed.locations} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(request.mock.calls.length).toBeGreaterThan(1));
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});

it('changes warehouse scope on store selection without calculating or posting balances', async () => {
  const seed = createDemoSeed(0, 'owner');
  const store = {
    ...seed.locations.find((l) => l.kind === 'stores')!,
    id: seed.id(950),
    name: 'Second store',
  };
  const warehouse = {
    ...seed.locations.find((l) => l.kind === 'warehouses')!,
    id: seed.id(951),
    name: 'Second warehouse',
    storeId: store.id,
  };
  request.mockImplementation(async (path: string) => {
    const url = new URL(path, 'http://localhost');
    return readCommerce(seed, url.pathname.split('/').slice(2).join('/'), url.searchParams, false);
  });
  render(
    <PayablePanel business={seed.business} locations={[...seed.locations, store, warehouse]} />,
  );
  await screen.findByRole('button', { name: 'View invoice INV-1048' });
  await userEvent.click(screen.getByRole('button', { name: 'Supplier balances store' }));
  await userEvent.click(
    screen.getByRole('radio', { name: 'Supplier balances store: Second store' }),
  );
  await waitFor(() =>
    expect(
      request.mock.calls.some((call) => String(call[0]).includes(`warehouseId=${warehouse.id}`)),
    ).toBe(true),
  );
  expect(request.mock.calls.every((call) => !call[1] || call[1] === 'GET')).toBe(true);
});
