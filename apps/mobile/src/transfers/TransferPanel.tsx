import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createTransferClient,
  createInventoryClient,
  ResourceModel,
  transferCreateForm,
  transferDetailForms,
  transferAddLineForm,
} from '@inventory/api-client';
import { hasPermission, businessTime } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { Text, View } from 'react-native';
import { Action, Choice, Field, styles } from '../organization/Controls';
import { CommandForm } from '../components/CommandForm';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
export function TransferPanel({
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
    [transferId, setTransferId] = useState('');
  const client = useMemo(
      () => createTransferClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    ),
    stock = useMemo(
      () => createInventoryClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        workspace: await client.load({ warehouseId, search, offset }),
        stock: await stock.load({ warehouseId, search, offset }),
        detail: transferId ? await client.detail(transferId) : null,
      })),
    [client, stock, warehouseId, search, offset, transferId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    if (warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId]);
  const forms =
    state.data && hasPermission(business, 'stock.write')
      ? [
          transferCreateForm(client, state.data.stock, warehouses, warehouseId),
          ...(state.data.detail?.transfer.state === 'draft'
            ? [transferAddLineForm(client, state.data.stock, warehouses, state.data.detail)]
            : []),
          ...(state.data.detail ? transferDetailForms(client, state.data.detail) : []),
        ]
      : [];
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header">Stock transfers</Text>
      <Text>
        Approval reserves stock. Dispatch moves it into transit. Receipt records good, damaged and
        explicitly confirmed lost quantities. Access to both warehouses is required; inter-business
        transfers are blocked.
      </Text>
      <Choice
        label="Transfer warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={(v) => {
          setWarehouseId(v);
          setTransferId('');
          setOffset(0);
        }}
      />
      <Field
        label="Search transfer reference / item"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setOffset(0);
        }}
      />
      {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      <Action
        label="Refresh transfers"
        onPress={() => void model.run()}
        disabled={state.busy || !warehouseId}
      />
      {state.data && (
        <>
          <Choice
            label="Transfer document"
            value={transferId}
            options={[
              { value: '', label: 'Select transfer' },
              ...state.data.workspace.transfers.map((t) => ({
                value: t.id,
                label: `${t.reference} · ${t.state}`,
              })),
            ]}
            onChange={setTransferId}
          />
          <Action
            label="Previous transfers page"
            disabled={!offset}
            onPress={() => setOffset(Math.max(0, offset - 25))}
          />
          <Action
            label="Next transfers page"
            disabled={!state.data.workspace.hasMore}
            onPress={() => setOffset(offset + 25)}
          />
          {state.data.detail && (
            <>
              <Text>
                {state.data.detail.transfer.reference} · {state.data.detail.transfer.state}
              </Text>
              {state.data.detail.lines.map((l) => (
                <Text key={l.id}>
                  {l.variantId} · approved base units {l.baseQuantity} · settled {l.settled}
                </Text>
              ))}
              {state.data.detail.receipts.map((r) => (
                <Text key={r.id}>
                  Receipt {r.id} · good {r.received} · damaged {r.damaged} · shortage {r.shortage} ·{' '}
                  {r.reason}
                </Text>
              ))}
              {state.data.detail.events.map((e) => (
                <Text key={e.id}>
                  {businessTime(e.createdAt, business.timeZone)} · {e.action} · actor {e.actorId} ·{' '}
                  {e.reason}
                </Text>
              ))}
            </>
          )}
          {forms.map((f) => (
            <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </View>
  );
}
