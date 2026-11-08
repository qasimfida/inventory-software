import { RecordTable } from '../ui/RecordTable';
import { EmptyState } from '../ui/AsyncState';
import { SidePanel } from '../ui/SidePanel';
import { Action } from '../ui/Controls';
import { Surface } from '../ui/Surface';
import { Text } from '../ui/Themed';
import { useState } from 'react';
import type { createStorageClient, createInventoryClient } from '@inventory/api-client';
type Storage = Awaited<ReturnType<ReturnType<typeof createStorageClient>['load']>>;
type Stock = Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>;
export function WarehouseBalances({
  totals,
  items,
}: {
  totals: Storage['totals'];
  items: Stock['items'];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Action variant="outline" label="Warehouse balances" onPress={() => setOpen(true)} />
      <SidePanel title="Warehouse balances" open={open} onClose={() => setOpen(false)}>
        <Surface>
          <Text tone="muted">
            Quantities across the warehouse for the returned stock records, not individual bins.
          </Text>
          {!totals.length ? (
            <EmptyState
              message="No warehouse balances"
              description="No stock totals were returned for this selection."
            />
          ) : (
            <RecordTable
              label="Warehouse balances"
              columns={['Product / SKU', 'On hand', 'Reserved', 'Damaged', 'In transit']}
              rows={totals.map((t) => ({
                id: t.variantId,
                cells: [
                  items.find((i) => i.id === t.variantId)?.sku ??
                    `Product reference: ${t.variantId}`,
                  t.onHand,
                  t.reserved,
                  t.damaged,
                  t.inTransit,
                ],
              }))}
            />
          )}
        </Surface>
      </SidePanel>
    </>
  );
}
