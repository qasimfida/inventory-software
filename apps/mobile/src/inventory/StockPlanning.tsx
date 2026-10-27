import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import {
  createStockPlanningClient,
  ResourceModel,
  stockPlanningForms,
} from '@inventory/api-client';
import type { createInventoryClient } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { CommandForm } from '../components/CommandForm';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { StatusBadge } from '../ui/StatusBadge';
import { useTheme } from '../theme';
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
  const theme = useTheme(),
    [offset, setOffset] = useState(0),
    [open, setOpen] = useState(false);
  const client = useMemo(
    () => createStockPlanningClient(authClient.organizationRequest, operationKey, business.id),
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
    <View style={{ gap: theme.spacing.medium }}>
      <Action
        label={open ? 'Hide reorder policies and order holds' : 'Reorder policies and order holds'}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Text>
            Order holds reserve real stock until cancellation or expiry. They do not post sales or
            payments. Fulfillment integration is not yet available. Reorder points are replenishment
            thresholds, not allocation buffers.
          </Text>
          {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
          {state.busy && <LoadingState message="Loading stock planning…" />}
          {state.data && (
            <>
              {!state.busy &&
                !state.error &&
                stockPlanningForms(client, state.data, stock, business, warehouseId).map((form) => (
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
              <Text accessibilityRole="header">Reorder policies by location</Text>
              {!state.data.reorders.length ? (
                <EmptyState
                  message="No reorder policies on this page"
                  description="Authorized business administrators can set a base-unit threshold and target for each SKU and location."
                />
              ) : (
                state.data.reorders.map((p) => (
                  <View key={`${p.variantId}-${p.locationId}`} style={{ gap: theme.spacing.small }}>
                    <Text>
                      {p.sku} · {p.locationName}
                    </Text>
                    <Text>
                      Available: {p.available} · Reorder point: {p.reorderPoint} · Target:{' '}
                      {p.targetQuantity}
                    </Text>
                    <StatusBadge
                      tone={p.needsReorder ? 'warning' : 'neutral'}
                      label={
                        !p.active
                          ? 'Inactive'
                          : p.needsReorder
                            ? 'Reorder needed'
                            : 'Above threshold'
                      }
                    />
                  </View>
                ))
              )}
              <Text accessibilityRole="header">Order stock holds</Text>
              {!state.data.holds.length ? (
                <EmptyState
                  message="No order holds on this page"
                  description="Create a uniquely referenced hold to allocate available stock for up to 24 hours."
                />
              ) : (
                state.data.holds.map((h) => (
                  <View key={h.id} style={{ gap: theme.spacing.small }}>
                    <Text>
                      {h.reference} ·{' '}
                      {stock.items.find((i) => i.id === h.variantId)?.sku ?? h.variantId}
                    </Text>
                    <Text>
                      Held: {h.quantity} · Remaining: {h.remaining}
                    </Text>
                    <StatusBadge label={h.state} />
                    <Text>Expires: {businessTime(h.expiresAt, business.timeZone)}</Text>
                    <Text>Created by: {h.createdBy}</Text>
                  </View>
                ))
              )}
              {offset > 0 && (
                <Action
                  label="Previous policies / holds"
                  onPress={() => setOffset(Math.max(0, offset - 25))}
                />
              )}
              {state.data.hasMore && (
                <Action label="Next policies / holds" onPress={() => setOffset(offset + 25)} />
              )}
              <Action
                label="Refresh stock planning"
                onPress={() => void model.run()}
                disabled={state.busy}
              />
              <Text accessibilityRole="header">Adjustment reason codes</Text>
              {state.data.reasons.map((r) => (
                <Text key={r.code}>
                  {r.code} — {r.label} · {r.directions.join(', ')} ·{' '}
                  {r.builtin ? 'Built-in' : r.active ? 'Custom active' : 'Custom inactive'}
                </Text>
              ))}
            </>
          )}
        </>
      )}
    </View>
  );
}
