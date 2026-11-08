// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { accountingPageSchema } from '@inventory/contracts';
import { createDemoSeed } from '../../../../packages/api-client/src/mock/seed';
import { AccountingSummary, AccountingPending } from './AccountingSummary';
import { JournalDetails } from './JournalDetails';
import { vi } from 'vitest';
vi.mock('react-native', () => vi.importActual('react-native-web'));
vi.mock('react-native-safe-area-context', () => import('../ui/safe-area-test-adapter'));
afterEach(cleanup);
const data = accountingPageSchema.parse(createDemoSeed(0, 'owner').accounting);
it('preserves large debit/credit strings and separates currencies', () => {
  render(
    <AccountingSummary
      data={{
        periods: [],
        balances: [
          { account: '1000', currency: 'USD', debit: '9007199254740993', credit: '0' },
          { account: '1000', currency: 'PKR', debit: '12345', credit: '67890' },
        ],
      }}
    />,
  );
  for (const value of ['9007199254740993', '12345', '67890', 'USD', 'PKR'])
    expect(screen.getByText(value)).toBeTruthy();
  expect(screen.getByText('No accounting periods on this page')).toBeTruthy();
});
it('shows posted lines and reversal references without controls or new calculations', () => {
  const journal = {
    ...data.journals[0]!,
    sourceKind: 'reversal',
    sourceId: null,
    reversalId: '00000000-0000-4000-8000-000000000991',
  };
  render(<JournalDetails journal={journal} timeZone="UTC" />);
  for (const value of [journal.reason, journal.reversalId, 'Not applicable', 'Journal lines'])
    expect(screen.getAllByText(value).length).toBeGreaterThan(0);
  for (const line of journal.lines)
    expect(screen.getAllByText(line.debit).length).toBeGreaterThan(0);
  expect(screen.queryByRole('button')).toBeNull();
});
it('keeps an empty source page distinct from a reconciliation claim', () => {
  render(<AccountingPending pending={[]} />);
  expect(screen.getByText('No unposted sources on this page')).toBeTruthy();
  expect(screen.queryByText('Reconciled')).toBeNull();
});
