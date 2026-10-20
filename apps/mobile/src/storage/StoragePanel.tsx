import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createStorageClient,
  createInventoryClient,
  ResourceModel,
  storageForms,
  storageMoveForm,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { LocationLabel } from './LocationLabel';
import { Text, View } from 'react-native';
import { Action, Choice, Field, styles } from '../organization/Controls';
import { CommandForm } from '../components/CommandForm';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
export function StoragePanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? ''),
    [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0);
  const client = useMemo(
      () => createStorageClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    ),
    stock = useMemo(
      () => createInventoryClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        storage: await client.load({ warehouseId, search, offset }),
        stock: await stock.load({ warehouseId, search, offset }),
      })),
    [client, stock, warehouseId, search, offset],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    if (warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId]);
  const forms = state.data
    ? [
        ...(hasPermission(business, 'locations.write')
          ? storageForms(client, state.data.storage, warehouseId)
          : []),
        ...(hasPermission(business, 'stock.write')
          ? [storageMoveForm(client, state.data.storage, state.data.stock, warehouseId)]
          : []),
      ]
    : [];
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header">Storage locations</Text>
      <Text>
        Capacity is descriptive metadata. Moves relocate available undamaged stock. Barcode labels
        encode the location UUID; scan quality requires device validation.
      </Text>
      <Choice
        label="Storage warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={(v) => {
          setWarehouseId(v);
          setOffset(0);
        }}
      />
      <Field
        label="Search storage code / name"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setOffset(0);
        }}
      />
      {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      <Action
        label="Refresh storage"
        onPress={() => void model.run()}
        disabled={state.busy || !warehouseId}
      />
      {state.data && (
        <>
          <Action
            label="Previous storage page"
            disabled={!offset}
            onPress={() => setOffset(Math.max(0, offset - 50))}
          />
          <Action
            label="Next storage page"
            disabled={!state.data.storage.hasMore}
            onPress={() => setOffset(offset + 50)}
          />
          {state.data.storage.locations.map((l) => (
            <View key={l.id}>
              <Text>
                {l.name} · {l.type} · {l.state} · parent {l.parentId ?? 'none'}
              </Text>
              <LocationLabel id={l.id} code={l.code} />
            </View>
          ))}
          {state.data.storage.totals.map((t) => (
            <Text key={t.variantId}>
              {t.variantId} · warehouse on hand {t.onHand} · reserved {t.reserved} · damaged{' '}
              {t.damaged} · transit {t.inTransit}
            </Text>
          ))}
          {forms.map((f) => (
            <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </View>
  );
}
