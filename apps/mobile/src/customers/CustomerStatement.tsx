import { Pagination } from '../ui/Pagination';
import { RecordDetails } from '../ui/RecordDetails';
import { MetricCard } from '../ui/MetricCard';
import { formatMinorUnits } from '@inventory/domain';
import { businessTime } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import type { createCustomerClient } from '@inventory/api-client';

export function CustomerStatement({
  statement,
  business,
  statementOffset,
  busy = false,
  setStatementOffset,
}: {
  statement: Awaited<ReturnType<ReturnType<typeof createCustomerClient>['statement']>>;
  business: Business;
  statementOffset: number;
  busy?: boolean;
  setStatementOffset: (v: number) => void;
}) {
  return (
    <>
      <MetricCard
        label="Outstanding"
        value={formatMinorUnits(statement.outstandingMinor, statement.currency)}
        unit={statement.currency}
        primary
      />
      {statement.receivables.map((r) => (
        <RecordDetails
          key={r.id}
          label="Customer receivable"
          items={[
            { label: 'Sale', value: r.saleId },
            { label: 'Due date', value: r.dueDate },
            { label: `Outstanding (${statement.currency} minor units)`, value: r.outstandingMinor },
          ]}
        />
      ))}
      {statement.payments.map((p) => (
        <RecordDetails
          key={p.id}
          label="Customer payment"
          items={[
            { label: `Cash (${statement.currency} minor units)`, value: p.amountMinor },
            { label: 'Reference', value: p.reference },
            { label: 'Time', value: businessTime(p.createdAt, business.timeZone) },
          ]}
        />
      ))}
      {statement.refunds.map((r) => (
        <RecordDetails
          key={r.id}
          label="Customer refund"
          items={[
            { label: `Cash refund (${statement.currency} minor units)`, value: r.amountMinor },
            { label: 'Return', value: r.sourceId },
          ]}
        />
      ))}
      {statement.credits.map((c) => (
        <RecordDetails
          key={c.id}
          label="Customer credit"
          items={[
            { label: `Credit (${statement.currency} minor units)`, value: c.amountMinor },
            { label: 'Source', value: c.sourceId },
          ]}
        />
      ))}

      <Pagination
        label="statement"
        offset={statementOffset}
        pageSize={25}
        hasMore={statement.hasMore}
        busy={busy}
        onChange={setStatementOffset}
      />
    </>
  );
}
