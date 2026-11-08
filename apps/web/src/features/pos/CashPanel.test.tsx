// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createDemoSeed } from '../../../../../packages/api-client/src/mock/seed';
const request = vi.hoisted(() => vi.fn());
vi.mock('@/platform/auth-client', () => ({ authClient: { organizationRequest: request } }));
import { CashPanel } from './CashPanel';
afterEach(cleanup);
it('shows my open shift outside empty history and closes through the existing reconciliation form', async () => {
  const seed = createDemoSeed(0, 'owner'),
    shift = {
      ...seed.shifts[0]!,
      state: 'open',
      canClose: true,
      actorName: 'owner@example.test',
      terminalName: 'Main till',
      storeName: 'Main store',
    };
  let closed = false;
  request.mockImplementation(async (path: string, method?: string) => {
    if (method === 'POST') {
      expect(path).toContain('/close');
      closed = true;
      return { id: shift.id };
    }
    return {
      shifts: [],
      activeShifts: closed ? [] : [shift],
      staff: [],
      hasMore: false,
      offset: 0,
    };
  });
  render(
    <CashPanel
      business={seed.business}
      warehouseId={shift.warehouseId}
      locations={seed.locations}
    />,
  );
  const active = await screen.findByRole('region', { name: 'My open cash shift' });
  expect(active.textContent).toContain('Main till');
  await userEvent.click(
    within(active).getByRole('button', { name: `Close cash shift ${shift.id}` }),
  );
  const dialog = screen.getByRole('dialog');
  await userEvent.type(
    within(dialog).getByLabelText('Counted cash (minor units)'),
    shift.expectedMinor,
  );
  await userEvent.click(
    within(dialog).getByRole('button', { name: `Close cash shift ${shift.id}` }),
  );
  await waitFor(() =>
    expect(screen.queryByRole('region', { name: 'My open cash shift' })).toBeNull(),
  );
  expect(request.mock.calls.filter((c) => c[1] === 'POST')).toHaveLength(1);
}, 15000);
it('preserves the active shift and reports a failed close without retrying the mutation', async () => {
  const seed = createDemoSeed(0, 'owner');
  const shift = { ...seed.shifts[0]!, state: 'open', canClose: true };
  request.mockReset();
  request.mockImplementation(async (path: string, method?: string) => {
    if (method === 'POST') {
      expect(path).toContain('/close');
      throw new Error('Network unavailable');
    }
    return { shifts: [], activeShifts: [shift], staff: [], hasMore: false, offset: 0 };
  });
  render(
    <CashPanel
      business={seed.business}
      warehouseId={shift.warehouseId}
      locations={seed.locations}
    />,
  );
  const active = await screen.findByRole('region', { name: 'My open cash shift' });
  await userEvent.click(
    within(active).getByRole('button', { name: `Close cash shift ${shift.id}` }),
  );
  const dialog = screen.getByRole('dialog');
  await userEvent.type(
    within(dialog).getByLabelText('Counted cash (minor units)'),
    shift.expectedMinor,
  );
  await userEvent.click(
    within(dialog).getByRole('button', { name: `Close cash shift ${shift.id}` }),
  );
  expect(await screen.findByRole('alert')).toBeTruthy();
  expect(screen.getByRole('region', { name: 'My open cash shift', hidden: true })).toBeTruthy();
  expect(request.mock.calls.filter((call) => call[1] === 'POST')).toHaveLength(1);
});
