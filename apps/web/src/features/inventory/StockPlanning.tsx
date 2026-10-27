import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createStockPlanningClient,
  ResourceModel,
  stockPlanningForms,
} from '@inventory/api-client';
import type { createInventoryClient } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { CommandForm } from '@/components/common/CommandForm';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { AccordionSection } from '@/components/ui/Accordion';
import { Table, TableScroll } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
type Stock = Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>;
export function StockPlanning({
  business,
  warehouseId,
  stock,
  onChanged,
}: {
  business: Business;
  warehouseId: string;
  stock: Stock;
  onChanged: () => void;
}) {
  const [offset, setOffset] = useState(0),
    [open, setOpen] = useState(false);
  const client = useMemo(
    () =>
      createStockPlanningClient(
        authClient.organizationRequest,
        () => crypto.randomUUID(),
        business.id,
      ),
    [business.id],
  );
  const model = useMemo(
    () => new ResourceModel(() => client.load(warehouseId, offset)),
    [client, warehouseId, offset],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    if (open) void model.run();
    return model.reset;
  }, [model, open]);
  return (
    <AccordionSection
      id="stock-planning"
      title="Reorder policies and order holds"
      open={open}
      onOpenChange={setOpen}
      className="space-y-4 rounded-lg border p-4"
    >
      <p>
        Order holds reserve real stock until cancellation or expiry. They do not post sales or
        payments. Fulfillment integration is not yet available. Reorder points are replenishment
        thresholds, not allocation buffers.
      </p>
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {state.busy && <LoadingState message="Loading stock planning…" />}
      {state.data && (
        <>
          <fieldset disabled={state.busy || Boolean(state.error)} className="flex flex-wrap gap-2">
            {stockPlanningForms(client, state.data, stock, business, warehouseId).map((form) => (
              <CommandForm
                key={form.title}
                definition={form}
                run={(work) =>
                  void model.run(async () => {
                    await work();
                    onChanged();
                  })
                }
              />
            ))}
          </fieldset>
          <h3>Reorder policies by location</h3>
          {!state.data.reorders.length ? (
            <EmptyState
              message="No reorder policies on this page"
              description="Authorized business administrators can set a base-unit threshold and target for each SKU and location."
            />
          ) : (
            <TableScroll label="Reorder policies">
              <Table>
                <thead>
                  <tr>
                    {['SKU', 'Location', 'Available', 'Reorder point', 'Target', 'Status'].map(
                      (h) => (
                        <th key={h} scope="col">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {state.data.reorders.map((p) => (
                    <tr key={`${p.variantId}-${p.locationId}`}>
                      <th scope="row">{p.sku}</th>
                      <td>{p.locationName}</td>
                      <td data-numeric>{p.available}</td>
                      <td data-numeric>{p.reorderPoint}</td>
                      <td data-numeric>{p.targetQuantity}</td>
                      <td>
                        <StatusBadge tone={p.needsReorder ? 'warning' : 'neutral'}>
                          {!p.active
                            ? 'Inactive'
                            : p.needsReorder
                              ? 'Reorder needed'
                              : 'Above threshold'}
                        </StatusBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
          <h3>Order stock holds</h3>
          {!state.data.holds.length ? (
            <EmptyState
              message="No order holds on this page"
              description="Create a uniquely referenced hold to allocate available stock for up to 24 hours."
            />
          ) : (
            <TableScroll label="Order stock holds">
              <Table>
                <thead>
                  <tr>
                    {[
                      'Order reference',
                      'Item',
                      'Held',
                      'Remaining',
                      'State',
                      'Expires',
                      'Created by',
                    ].map((h) => (
                      <th key={h} scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.data.holds.map((h) => (
                    <tr key={h.id}>
                      <th scope="row">{h.reference}</th>
                      <td>{stock.items.find((i) => i.id === h.variantId)?.sku ?? h.variantId}</td>
                      <td data-numeric>{h.quantity}</td>
                      <td data-numeric>{h.remaining}</td>
                      <td>
                        <StatusBadge>{h.state}</StatusBadge>
                      </td>
                      <td>{businessTime(h.expiresAt, business.timeZone)}</td>
                      <td>{h.createdBy}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
          <div className="flex gap-2">
            {offset > 0 && (
              <Button onClick={() => setOffset(Math.max(0, offset - 25))}>
                Previous policies / holds
              </Button>
            )}
            {state.data.hasMore && (
              <Button onClick={() => setOffset(offset + 25)}>Next policies / holds</Button>
            )}
            <Button variant="ghost" onClick={() => void model.run()} disabled={state.busy}>
              Refresh stock planning
            </Button>
          </div>
          <h3>Adjustment reason codes</h3>
          <ul>
            {state.data.reasons.map((r) => (
              <li key={r.code}>
                {r.code} — {r.label} · {r.directions.join(', ')} ·{' '}
                {r.builtin ? 'Built-in' : r.active ? 'Custom active' : 'Custom inactive'}
              </li>
            ))}
          </ul>
        </>
      )}
    </AccordionSection>
  );
}
