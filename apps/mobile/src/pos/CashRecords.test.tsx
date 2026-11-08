// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import userEvent from '@testing-library/user-event';
import { CashRecords } from './CashRecords';
import { businessTime } from '@inventory/contracts';
afterEach(cleanup);
it('opens loaded reconciliation evidence without a mutation and retains exact amounts', async () => {
  const seed = createDemoSeed(0, 'owner');
  const run = vi.fn();
  const shift = {
    ...seed.shifts[0]!,
    state: 'closed' as const,
    expectedMinor: '10001',
    countedMinor: '9999',
    discrepancyMinor: '-2',
  };
  render(<CashRecords shifts={[shift]} forms={[]} timeZone="UTC" run={run} />);
  await userEvent.click(screen.getByRole('button', { name: businessTime(shift.openedAt, 'UTC') }));
  expect(screen.getAllByText('-2').length).toBeGreaterThan(0);
  expect(screen.getAllByText('10001').length).toBeGreaterThan(0);
  expect(screen.queryByRole('button', { name: `Close cash shift ${shift.id}` })).toBeNull();
  expect(run).not.toHaveBeenCalled();
});
it('explains an empty shift collection', () => {
  render(<CashRecords shifts={[]} forms={[]} timeZone="UTC" run={vi.fn()} />);
  expect(screen.getByText('No cash shifts')).toBeTruthy();
});
