import type { createAccountingClient } from '@inventory/api-client';
import { accountingAccounts } from '@inventory/contracts';
import { AccountingTable } from './AccountingTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
type Page = Awaited<ReturnType<ReturnType<typeof createAccountingClient>['load']>>;
export function AccountingSummary({ data }: { data: Pick<Page, 'balances' | 'periods'> }) {
  return (
    <>
      <AccountingTable
        title="Trial balance"
        columns={['Account', 'Currency', 'Debit (minor units)', 'Credit (minor units)']}
        numeric={[2, 3]}
        empty="No posted trial balances"
        rows={data.balances.map((b) => ({
          id: `${b.currency}:${b.account}`,
          cells: [
            `${b.account} · ${accountingAccounts.find((a) => a.code === b.account)?.name ?? b.account}`,
            b.currency,
            b.debit,
            b.credit,
          ],
        }))}
      />
      <AccountingTable
        title="Accounting periods"
        columns={['Starts', 'Ends', 'Status']}
        empty="No accounting periods on this page"
        rows={data.periods.map((p) => ({
          id: p.id,
          cells: [
            p.from,
            p.to,
            <StatusBadge key="state" tone={p.state === 'open' ? 'info' : 'neutral'}>
              {p.state === 'open' ? 'Open' : 'Closed'}
            </StatusBadge>,
          ],
        }))}
      />
    </>
  );
}
export function AccountingPending({ pending }: { pending: Page['pending'] }) {
  return (
    <AccountingTable
      title="Unposted sources on this page"
      columns={['Date', 'Source type', 'Source reference', 'Currency', 'Amount (minor units)']}
      numeric={[4]}
      empty="No unposted sources on this page"
      rows={pending.map((s) => ({
        id: `${s.kind}:${s.id}`,
        cells: [s.date, s.kind.replaceAll('_', ' '), s.id, s.currency, s.amount],
      }))}
    />
  );
}
