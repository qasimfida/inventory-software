import { WarehouseSelect } from '../ui/WarehouseSelect';
import { usePageCollection } from '../ui/usePageCollection';
import { Pagination } from '../ui/Pagination';
import { SearchControl } from '../ui/SearchControl';
import { IconAction } from '../ui/IconAction';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createStorageClient,
  createInventoryClient,
  cancellableResource,
  storageForms,
  storageMoveForm,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { LocationLabel } from './LocationLabel';
import { View } from 'react-native';
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
  const request = useMemo(
    () =>
      cancellableResource(
        async (signal) => ({
          storage: await client.load({ warehouseId, search, offset }, signal),
          stock: await stock.load({ warehouseId, search, offset }, signal),
        }),
        () => new AbortController(),
      ),
    [client, stock, warehouseId, search, offset],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, search],
    offset,
    ['storage.locations', 'storage.totals'],
    () => {
      setOffset(0);
    },
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (warehouseId) void model.run();
    }, 250);
    return () => {
      clearTimeout(timer);
      request.cancel();
    };
  }, [model, request, warehouseId]);
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
    <ScreenBody>
      <ScreenHeader
        title="Storage locations"
        description={
          <>
            Capacity is descriptive metadata. Moves relocate available undamaged stock. Barcode
            labels encode the location UUID; scan quality requires device validation.
          </>
        }
      />
      <WarehouseSelect
        label="Storage warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={(v) => {
          setWarehouseId(v);
          setOffset(0);
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <SearchControl
            suggestions={
              state.data?.storage.locations.map((item) => ({
                value: item.code,
                label: `${item.code} · ${item.name}`,
              })) ?? []
            }
            busy={state.busy || (!state.data && !state.error)}
            label="Search storage code / name"
            value={search}
            onChange={(v) => {
              setSearch(v);
              setOffset(0);
            }}
          />
        </View>
        <IconAction
          label="Refresh storage"
          onPress={() => void model.run()}
          disabled={state.busy || !warehouseId}
          icon="↻"
        />
      </View>
      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
      {state.data && (
        <>
          <Pagination
            label="locations"
            offset={offset}
            pageSize={50}
            hasMore={state.data?.storage.hasMore ?? false}
            busy={state.busy || (!state.data && !state.error)}
            onChange={setOffset}
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
    </ScreenBody>
  );
}
