import { useDisplayMoney } from '../ui/useDisplayMoney';
import { Pagination } from '../ui/Pagination';
import { CustomerEvidence } from './CustomerEvidence';
import { MetricCard } from '../ui/MetricCard';

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
  const { formatMinorUnits } = useDisplayMoney();

  return (
    <>
      <MetricCard
        label="Outstanding"
        value={formatMinorUnits(statement.outstandingMinor, statement.currency)}
        unit={statement.currency}
        primary
      />
      <CustomerEvidence
        title="Receivables"
        columns={['Sale reference', 'Due date', `Outstanding (${statement.currency})`]}
        rows={statement.receivables.map((r) => ({
          id: r.id,
          cells: [r.saleId, r.dueDate, formatMinorUnits(r.outstandingMinor, statement.currency)],
        }))}
      />
      <CustomerEvidence
        title="Cash payments"
        columns={['Receipt reference', 'Recorded at', `Amount (${statement.currency})`]}
        rows={statement.payments.map((p) => ({
          id: p.id,
          cells: [
            p.reference,
            businessTime(p.createdAt, business.timeZone),
            formatMinorUnits(p.amountMinor, statement.currency),
          ],
        }))}
      />
      <CustomerEvidence
        title="Cash refunds"
        columns={['Return reference', 'Recorded at', `Amount (${statement.currency})`]}
        rows={statement.refunds.map((r) => ({
          id: r.id,
          cells: [
            r.sourceId,
            businessTime(r.createdAt, business.timeZone),
            formatMinorUnits(r.amountMinor, statement.currency),
          ],
        }))}
      />
      <CustomerEvidence
        title="Credits"
        columns={['Source reference', 'Recorded at', `Amount (${statement.currency})`]}
        rows={statement.credits.map((c) => ({
          id: c.id,
          cells: [
            c.sourceId,
            businessTime(c.createdAt, business.timeZone),
            formatMinorUnits(c.amountMinor, statement.currency),
          ],
        }))}
      />

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
