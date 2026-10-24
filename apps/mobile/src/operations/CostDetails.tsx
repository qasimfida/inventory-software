import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ResourceModel, costPaymentForm } from '@inventory/api-client';
import type { createOperationsClient } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
import { RecordTable } from '../ui/RecordTable';
import { CommandForm } from '../components/CommandForm';
import { Pagination } from '../ui/Pagination';
export function CostDetails({
  client,
  id,
  onClose,
  onChange,
}: {
  client: ReturnType<typeof createOperationsClient>;
  id: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const [offset, setOffset] = useState(0),
    model = useMemo(() => new ResourceModel(() => client.detail(id, offset)), [client, id, offset]),
    state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  const cost = state.data?.cost;
  return (
    <SidePanel
      title="Cost and payment history"
      open
      onClose={() => {
        if (!state.busy) onClose();
      }}
    >
      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
      {cost && (
        <>
          <Text accessibilityRole="header">{cost.description}</Text>
          <Text>
            {cost.reference} · {cost.periodStart} — {cost.periodEnd}
          </Text>
          <Text>
            Total {formatMinorUnits(cost.amountMinor, cost.currency)} · Paid{' '}
            {formatMinorUnits(cost.paidMinor, cost.currency)}
          </Text>
          <RecordTable
            label="Payments"
            columns={['Date', 'Reference', 'Paid']}
            rows={(state.data?.payments ?? []).map((p) => ({
              id: p.id,
              cells: [p.paidOn, p.reference, formatMinorUnits(p.amountMinor, cost.currency)],
            }))}
          />
          {!state.data?.payments.length && <Text>No payments recorded.</Text>}
          <Pagination
            label="cost payments"
            offset={offset}
            pageSize={25}
            hasMore={state.data?.hasMore ?? false}
            busy={state.busy}
            onChange={setOffset}
          />
          {BigInt(cost.paidMinor) < BigInt(cost.amountMinor) && (
            <CommandForm
              inline
              definition={costPaymentForm(client, cost)}
              run={(work) =>
                void model.run(async () => {
                  await work();
                  onChange();
                })
              }
            />
          )}
        </>
      )}
    </SidePanel>
  );
}
