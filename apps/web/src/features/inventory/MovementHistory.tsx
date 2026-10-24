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
  return (
    <>
      {stock.movements.map((m) => (
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
            { label: 'Source', value: `${m.sourceKind}/${m.sourceId}` },
          ]}
        />
      ))}
    </>
  );
}
