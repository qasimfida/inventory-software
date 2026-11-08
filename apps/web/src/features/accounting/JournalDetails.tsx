import type { createAccountingClient } from '@inventory/api-client';
import { accountingAccounts, businessTime } from '@inventory/contracts';
import { AccountingTable } from './AccountingTable';
import { RecordDetails } from '@/components/common/RecordDetails';
type Journal = Awaited<
  ReturnType<ReturnType<typeof createAccountingClient>['load']>
>['journals'][number];
export function JournalDetails({
  journal,
  timeZone,
}: {
  journal: Journal;
  timeZone: string | undefined;
}) {
  return (
    <div className="min-w-0 shrink-0 space-y-3">
      <RecordDetails
        label="Journal metadata"
        items={[
          { label: 'Reason', value: journal.reason },
          { label: 'Posting date', value: journal.date },
          { label: 'Currency', value: journal.currency },
          { label: 'Journal reference', value: journal.id },
          { label: 'Source type', value: journal.sourceKind.replaceAll('_', ' ') },
          { label: 'Source reference', value: journal.sourceId ?? 'Not applicable' },
          { label: 'Reverses journal', value: journal.reversalId ?? 'Not a reversal' },
          { label: 'Recorded at', value: businessTime(journal.createdAt, timeZone) },
        ]}
      />
      <AccountingTable
        title="Journal lines"
        columns={[
          'Account',
          `Debit (${journal.currency} minor units)`,
          `Credit (${journal.currency} minor units)`,
        ]}
        numeric={[1, 2]}
        empty="No journal lines returned"
        rows={journal.lines.map((line, i) => ({
          id: String(i),
          cells: [
            `${line.account} · ${accountingAccounts.find((a) => a.code === line.account)?.name ?? line.account}`,
            line.debit,
            line.credit,
          ],
        }))}
      />
    </div>
  );
}
