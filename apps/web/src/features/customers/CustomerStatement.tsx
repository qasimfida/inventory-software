import { businessTime } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import type { createCustomerClient } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
export function CustomerStatement({
  statement,
  business,
  statementOffset,
  setStatementOffset,
}: {
  statement: Awaited<ReturnType<ReturnType<typeof createCustomerClient>['statement']>>;
  business: Business;
  statementOffset: number;
  setStatementOffset: (v: number) => void;
}) {
  return (
    <>
      <p>
        Outstanding: {statement.outstandingMinor} {statement.currency} minor units
      </p>
      {statement.receivables.map((r) => (
        <p key={r.id}>
          Sale {r.saleId} · due {r.dueDate} · outstanding {r.outstandingMinor}
        </p>
      ))}
      {statement.payments.map((p) => (
        <p key={p.id}>
          Cash {p.amountMinor} · {p.reference} · {businessTime(p.createdAt, business.timeZone)}
        </p>
      ))}
      {statement.refunds.map((r) => (
        <p key={r.id}>
          Cash refund {r.amountMinor} · return {r.sourceId}
        </p>
      ))}
      {statement.credits.map((c) => (
        <p key={c.id}>
          Credit {c.amountMinor} · source {c.sourceId}
        </p>
      ))}
      <Button
        onClick={() => setStatementOffset(Math.max(0, statementOffset - 25))}
        disabled={!statementOffset}
      >
        Previous statement page
      </Button>
      <Button
        onClick={() => setStatementOffset(statementOffset + 25)}
        disabled={!statement.hasMore}
      >
        Next statement page
      </Button>
    </>
  );
}
