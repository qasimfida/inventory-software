import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { createInventoryClient, ResourceModel, inventoryForms } from '@inventory/api-client';
import { hasPermission, businessTime } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { CommandForm } from '../components/CommandForm';
import { Action, Choice, Field, styles } from '../organization/Controls';
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
    () => createInventoryClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const model = useMemo(
    () =>
      new ResourceModel(() =>
        client.load({ warehouseId, search, offset, ...(cursor ? { cursor } : {}) }),
      ),
    [client, warehouseId, search, offset, cursor],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    if (warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId]);
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>
        Inventory ledger
      </Text>
      <Text>
        Available = on hand − reserved − damaged. In transit is separate. After an uncertain request
        followed by reload/sign-in, inspect history before creating another command.
      </Text>
      {!warehouses.length ? (
        <Text>Create an active warehouse to manage stock.</Text>
      ) : (
        <>
          <Choice
            label="Inventory warehouse"
            value={warehouseId}
            options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
            onChange={(value) => {
              setWarehouseId(value);
              setOffset(0);
              setCursor(undefined);
              setReconciliation('');
            }}
          />
          <Field
            label="Search stock item / SKU"
            value={search}
            onChange={(value) => {
              setSearch(value);
              setOffset(0);
            }}
            maxLength={120}
          />
          {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
          {state.busy && <Text>Loading inventory…</Text>}
          <Action
            label="Refresh inventory"
            disabled={state.busy}
            onPress={() => void model.run()}
          />
          {state.data && (
            <>
              <Text>
                {state.data.totals.balances} balance records; negative stock{' '}
                {state.data.policy.allowNegative ? 'allowed' : 'blocked'}.
              </Text>
              {state.data.balances.map((b) => (
                <Text key={`${b.variantId}-${b.locationId}`}>
                  {b.sku} · {b.locationName} · on hand {b.onHand} · reserved {b.reserved} · damaged{' '}
                  {b.damaged} · available {b.available} · in transit {b.inTransit}
                </Text>
              ))}
              <Action
                label="Previous stock page"
                disabled={!offset}
                onPress={() => setOffset(Math.max(0, offset - state.data!.limit))}
              />
              <Action
                label="Next stock page"
                disabled={!state.data.hasMore}
                onPress={() => setOffset(offset + state.data!.limit)}
              />
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
              <Action
                label="Reconcile inventory"
                onPress={() =>
                  void model.run(async () => {
                    const result = await client.reconcile(warehouseId);
                    setReconciliation(
                      result.consistent
                        ? 'Ledger and balances reconcile.'
                        : `${result.mismatches.length} mismatches require investigation.`,
                    );
                  })
                }
              />
              {reconciliation && <Text accessibilityLiveRegion="polite">{reconciliation}</Text>}
              <Text accessibilityRole="header">Movement history</Text>
              {state.data.movements.map((m) => (
                <Text key={m.id}>
                  {businessTime(m.createdAt, business.timeZone)} · {m.type} ·{' '}
                  {state.data!.items.find((i) => i.id === m.variantId)?.sku ?? m.variantId} ·
                  quantity {m.quantityDelta} · reserved {m.reservedDelta} · damaged {m.damagedDelta}{' '}
                  · in transit {m.transitDelta} · {m.reason} · source {m.sourceKind}/{m.sourceId}
                </Text>
              ))}
              {state.data.nextCursor && (
                <Action
                  label="Older stock movements"
                  onPress={() => setCursor(state.data!.nextCursor ?? undefined)}
                />
              )}
              {cursor && (
                <Action label="Latest stock movements" onPress={() => setCursor(undefined)} />
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}
