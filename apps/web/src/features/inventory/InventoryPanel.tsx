import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createInventoryClient, ResourceModel, inventoryForms } from '@inventory/api-client';
import { hasPermission, businessTime } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { CommandForm } from '@/components/common/CommandForm';
import { Input, Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function InventoryPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? ''),
    [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [cursor, setCursor] = useState<string | undefined>(undefined),
    [reconciliation, setReconciliation] = useState('');
  const client = useMemo(
    () =>
      createInventoryClient(authClient.organizationRequest, () => crypto.randomUUID(), business.id),
    [business.id],
  );
  const model = useMemo(
    () =>
      new ResourceModel(() =>
        client.load({ warehouseId, search, offset, ...(cursor ? { cursor } : {}) }),
      ),
    [client, warehouseId, search, offset, cursor],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    if (warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId]);
  return (
    <section aria-label="Inventory ledger" className="space-y-3 border-t pt-4">
      <h2>Inventory ledger</h2>
      <p>
        On hand includes damaged units. Available = on hand − reserved − damaged. In transit is
        separate. If a request outcome is uncertain after reload or sign-in, inspect history before
        creating another command.
      </p>
      {!warehouses.length ? (
        <p>Create an active warehouse to manage stock.</p>
      ) : (
        <>
          <label htmlFor="stock-warehouse">Inventory warehouse</label>
          <Select
            id="stock-warehouse"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
              setOffset(0);
              setCursor(undefined);
              setReconciliation('');
            }}
          >
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <label htmlFor="stock-search">Search stock item / SKU</label>
          <Input
            id="stock-search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOffset(0);
            }}
            maxLength={120}
          />
          {state.error && <p role="alert">{state.error}</p>}
          {state.busy && <p role="status">Loading inventory…</p>}
          <Button disabled={state.busy} onClick={() => void model.run()}>
            Refresh inventory
          </Button>
          {state.data && (
            <>
              <p>
                {state.data.totals.balances} balance records; negative stock{' '}
                {state.data.policy.allowNegative ? 'allowed' : 'blocked'}.
              </p>
              <ul>
                {state.data.balances.map((b) => (
                  <li key={`${b.variantId}-${b.locationId}`}>
                    {b.sku} · {b.locationName} · on hand {b.onHand} · reserved {b.reserved} ·
                    damaged {b.damaged} · available {b.available} · in transit {b.inTransit}
                  </li>
                ))}
              </ul>
              <Button
                disabled={!offset}
                onClick={() => setOffset(Math.max(0, offset - state.data!.limit))}
              >
                Previous stock page
              </Button>
              <Button
                disabled={!state.data.hasMore}
                onClick={() => setOffset(offset + state.data!.limit)}
              >
                Next stock page
              </Button>
              {hasPermission(business, 'stock.write') &&
                inventoryForms(client, state.data, warehouseId).map((form) => (
                  <CommandForm
                    key={form.title}
                    definition={form}
                    run={(work) => void model.run(work)}
                  />
                ))}
              {hasPermission(business, 'business.write') && (
                <CommandForm
                  definition={{
                    title: 'Save inventory policy',
                    fields: [
                      {
                        name: 'allowNegative',
                        label: 'Allow negative stock',
                        kind: 'boolean',
                        value: state.data.policy.allowNegative,
                      },
                    ],
                    submit: (v) =>
                      client.policy({
                        allowNegative: v.allowNegative === true,
                        version: state.data!.policy.version,
                      }),
                  }}
                  run={(work) => void model.run(work)}
                />
              )}
              <Button
                onClick={() =>
                  void model.run(async () => {
                    const result = await client.reconcile(warehouseId);
                    setReconciliation(
                      result.consistent
                        ? 'Ledger and balances reconcile.'
                        : `${result.mismatches.length} mismatches require investigation.`,
                    );
                  })
                }
              >
                Reconcile inventory
              </Button>
              {reconciliation && <p role="status">{reconciliation}</p>}
              <h3>Movement history</h3>
              <ul>
                {state.data.movements.map((m) => (
                  <li key={m.id}>
                    {businessTime(m.createdAt, business.timeZone)} · {m.type} ·{' '}
                    {state.data!.items.find((i) => i.id === m.variantId)?.sku ?? m.variantId} ·
                    quantity {m.quantityDelta} · reserved {m.reservedDelta} · damaged{' '}
                    {m.damagedDelta} · in transit {m.transitDelta} · {m.reason} · source{' '}
                    {m.sourceKind}/{m.sourceId}
                  </li>
                ))}
              </ul>
              {state.data.nextCursor && (
                <Button onClick={() => setCursor(state.data!.nextCursor ?? undefined)}>
                  Older stock movements
                </Button>
              )}
              {cursor && (
                <Button onClick={() => setCursor(undefined)}>Latest stock movements</Button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
