import { businessTime } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import type { createCustomerClient } from '@inventory/api-client';
import { Text } from 'react-native';
import { Action } from '../organization/Controls';
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
      <Text>
        Outstanding: {statement.outstandingMinor} {statement.currency} minor units
      </Text>
      {statement.receivables.map((r) => (
        <Text key={r.id}>
          Sale {r.saleId} · due {r.dueDate} · outstanding {r.outstandingMinor}
        </Text>
      ))}
      {statement.payments.map((p) => (
        <Text key={p.id}>
          Cash {p.amountMinor} · {p.reference} · {businessTime(p.createdAt, business.timeZone)}
        </Text>
      ))}
      {statement.refunds.map((r) => (
        <Text key={r.id}>
          Cash refund {r.amountMinor} · return {r.sourceId}
        </Text>
      ))}
      {statement.credits.map((c) => (
        <Text key={c.id}>
          Credit {c.amountMinor} · source {c.sourceId}
        </Text>
      ))}
      <Action
        label="Previous statement page"
        onPress={() => setStatementOffset(Math.max(0, statementOffset - 25))}
        disabled={!statementOffset}
      />
      <Action
        label="Next statement page"
        onPress={() => setStatementOffset(statementOffset + 25)}
        disabled={!statement.hasMore}
      />
    </>
  );
}
