import { EmptyState } from '@/components/common/AsyncState';
import { FormSheet } from '@/components/common/FormSheet';
import { Button } from '@/components/ui/Button';
import { Table, TableScroll } from '@/components/ui/Table';
import { Panel } from '@/components/common/Layout';
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
      <Button variant="outline" onClick={() => setOpen(true)}>
        Warehouse balances
      </Button>
      <FormSheet
        title="Warehouse balances"
        description="Current stock totals across the warehouse."
        open={open}
        onOpenChange={setOpen}
      >
        <Panel aria-label="Warehouse balances" className="shrink-0">
          <p className="text-sm text-muted-foreground">
            Quantities across the warehouse for the returned stock records. These are not individual
            bin balances.
          </p>
          {!totals.length ? (
            <EmptyState
              message="No warehouse balances"
              description="No stock totals were returned for this selection."
            />
          ) : (
            <TableScroll label="Warehouse balances">
              <Table>
                <thead>
                  <tr>
                    <th>Product / SKU</th>
                    <th className="text-right">On hand</th>
                    <th className="text-right">Reserved</th>
                    <th className="text-right">Damaged</th>
                    <th className="text-right">In transit</th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((t) => (
                    <tr key={t.variantId}>
                      <th scope="row">
                        {items.find((i) => i.id === t.variantId)?.sku ??
                          `Product reference: ${t.variantId}`}
                      </th>
                      {[t.onHand, t.reserved, t.damaged, t.inTransit].map((value, i) => (
                        <td key={i} className="text-right tabular-nums">
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Panel>
      </FormSheet>
    </>
  );
}
