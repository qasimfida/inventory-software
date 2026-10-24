// @vitest-environment jsdom
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('react-native', () => vi.importActual('react-native-web'));
const request = vi.hoisted(() => vi.fn());
vi.mock('../auth/client', () => ({ authClient: { organizationRequest: request } }));
import { AccountingPanel } from './AccountingPanel';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it('defers native accounting data and renders exact posted balances', async () => {
  request.mockResolvedValue({
    periods: [],
    journals: [],
    pending: [],
    balances: [{ account: '1000', currency: 'USD', debit: '9007199254740993', credit: '0' }],
    hasMore: false,
    offset: 0,
  });
  render(
    <AccountingPanel
      business={{
        id: '00000000-0000-4000-8000-000000000001',
        name: 'Native',
        role: 'owner',
        state: 'active',
        version: 1,
      }}
    />,
  );
  expect(request).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Accounting' }));
  const balance = within(await screen.findByLabelText('Trial balance account'));
  for (const value of [
    '1000',
    'USD',
    'Debit (minor units)',
    '9007199254740993',
    'Credit (minor units)',
    '0',
  ])
    expect(balance.getByText(value, { exact: true })).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Confirm balanced manual journal' }));
  expect(screen.getByLabelText('Journal reason (at least 10 characters)')).toBeTruthy();
  expect(request).toHaveBeenCalledTimes(1);
});
