import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ResourceModel, costPaymentForm } from '@inventory/api-client';
import type { createOperationsClient } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { FormSheet } from '@/components/common/FormSheet';
import { Table, TableScroll } from '@/components/ui/Table';
import { CommandForm } from '@/components/common/CommandForm';
import { Pagination } from '@/components/common/Pagination';
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
    <FormSheet
      title="Cost and payment history"
      open
      onOpenChange={(v) => {
        if (!v && !state.busy) onClose();
      }}
    >
      {state.error && <p role="alert">{state.error}</p>}
      {cost && (
        <>
          <h3>{cost.description}</h3>
          <p>
            {cost.reference} · {cost.periodStart} — {cost.periodEnd}
          </p>
          <p>
            Total {formatMinorUnits(cost.amountMinor, cost.currency)} · Paid{' '}
            {formatMinorUnits(cost.paidMinor, cost.currency)}
          </p>
          <TableScroll label="Payments">
            <Table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th data-numeric>Paid</th>
                </tr>
              </thead>
              <tbody>
                {state.data?.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.paidOn}</td>
                    <th scope="row">{p.reference}</th>
                    <td data-numeric>{formatMinorUnits(p.amountMinor, cost.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
          {!state.data?.payments.length && <p>No payments recorded.</p>}
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
    </FormSheet>
  );
}
