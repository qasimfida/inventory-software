import { RecordTable } from '../ui/RecordTable';
import { Action } from '../ui/Controls';
import { SidePanel } from '../ui/SidePanel';
import { EmptyState } from '../ui/AsyncState';
import { useState } from 'react';
import type { createInventoryClient } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import { RecordDetails } from '../ui/RecordDetails';
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
      <RecordTable
        label="Stock movement history"
        columns={['Time', 'SKU', 'Movement', 'Quantity change', 'Reason']}
        rows={stock.movements.map((m) => ({
          id: m.id,
          cells: [
            <Action
              key={m.id}
              variant="ghost"
              label={businessTime(m.createdAt, timeZone)}
              onPress={() => setSelected(m.id)}
            />,
            stock.items.find((i) => i.id === m.variantId)?.sku ?? m.variantId,
            m.type,
            m.quantityDelta,
            m.reason,
          ],
        }))}
      />
      <SidePanel title="Stock movement" open={Boolean(movement)} onClose={() => setSelected(null)}>
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
      </SidePanel>
    </>
  );
}
