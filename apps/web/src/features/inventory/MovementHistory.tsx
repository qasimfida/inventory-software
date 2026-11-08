import { Table, TableScroll } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { FormSheet } from '@/components/common/FormSheet';
import { EmptyState } from '@/components/common/AsyncState';
import { useState } from 'react';
import type { createInventoryClient } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import { RecordDetails } from '@/components/common/RecordDetails';
type Stock = Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>;
export function MovementHistory({
  stock,
  timeZone,
}: {
  stock: Stock;
  timeZone: string | undefined;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const movement = stock.movements.find((m) => m.id === selected);
  if (!stock.movements.length)
    return (
      <EmptyState
        message="No stock movements"
        description="Posted stock movements will appear here with their reason and transaction reference."
      />
    );
  return (
    <>
      <TableScroll label="Stock movement history">
        <Table>
          <thead>
            <tr>
              {['Time', 'SKU', 'Movement', 'Quantity change', 'Reason'].map((label) => (
                <th key={label} scope="col" data-numeric={label === 'Quantity change' || undefined}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stock.movements.map((m) => (
              <tr key={m.id}>
                <th scope="row">
                  <Button variant="link" onClick={() => setSelected(m.id)}>
                    {businessTime(m.createdAt, timeZone)}
                  </Button>
                </th>
                <td>{stock.items.find((i) => i.id === m.variantId)?.sku ?? m.variantId}</td>
                <td>{m.type}</td>
                <td data-numeric>{m.quantityDelta}</td>
                <td>{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
      <FormSheet
        title="Stock movement"
        open={Boolean(movement)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        {movement &&
          [movement].map((m) => (
            <RecordDetails
              key={m.id}
              label="Stock movement"
              items={[
                { label: 'Timestamp', value: businessTime(m.createdAt, timeZone) },
                { label: 'Movement type', value: m.type },
                {
                  label: 'SKU / item',
                  value: stock.items.find((i) => i.id === m.variantId)?.sku ?? m.variantId,
                },
                { label: 'Quantity change', value: m.quantityDelta },
                { label: 'Reserved change', value: m.reservedDelta },
                { label: 'Damaged change', value: m.damagedDelta },
                { label: 'In-transit change', value: m.transitDelta },
                { label: 'Reason', value: m.reason },
                {
                  label: 'Reason code',
                  value: m.reasonCode
                    ? `${m.reasonCode} · ${m.reasonLabel}`
                    : 'Unclassified (legacy or source-managed)',
                },
                { label: 'Source', value: `${m.sourceKind}/${m.sourceId}` },
                { label: 'Actor reference', value: m.actorId },
                {
                  label: 'Location',
                  value: stock.locations.find((l) => l.id === m.locationId)?.name ?? m.locationId,
                },
                { label: 'Movement reference', value: m.id },
                { label: 'Reverses movement', value: m.reversalOf ?? 'None' },
              ]}
            />
          ))}
      </FormSheet>
    </>
  );
}
