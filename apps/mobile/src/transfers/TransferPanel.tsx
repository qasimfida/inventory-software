import { View } from 'react-native';
import { RecordCollection } from '../ui/RecordCollection';
import { SidePanel } from '../ui/SidePanel';
import { WarehouseSelect } from '../ui/WarehouseSelect';
import { usePageCollection } from '../ui/usePageCollection';
import { Pagination } from '../ui/Pagination';
import { SearchControl } from '../ui/SearchControl';
import { IconAction } from '../ui/IconAction';
import { TransferDetails } from './TransferDetails';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createTransferClient,
  createInventoryClient,
  cancellableResource,
  transferCreateForm,
  transferDetailForms,
  transferAddLineForm,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
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
  const request = useMemo(
    () =>
      cancellableResource(
        async (signal) => ({
          workspace: await client.load({ warehouseId, search, offset }, signal),
          stock: await stock.load({ warehouseId, search, offset }, signal),
          detail: transferId ? await client.detail(transferId) : null,
        }),
        () => new AbortController(),
      ),
    [client, stock, warehouseId, search, offset, transferId],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, search],
    offset,
    ['workspace.transfers'],
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
  const toolbar = (
    <>
      <View style={{ flexGrow: 1, flexBasis: 160 }}>
        <SearchControl
          suggestions={
            state.data?.workspace.transfers.map((item) => ({
              value: item.reference,
              label: item.reference,
            })) ?? []
          }
          busy={state.busy || (!state.data && !state.error)}
          label="Search transfer reference / item"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setOffset(0);
          }}
        />
      </View>
      <IconAction
        label="Refresh transfers"
        onPress={() => void model.run()}
        disabled={state.busy || !warehouseId}
        icon="↻"
      />
    </>
  );
  return (
    <ScreenBody>
      <ScreenHeader
        title="Stock transfers"
        description={
          <>
            Approval reserves stock. Dispatch moves it into transit. Receipt records good, damaged
            and explicitly confirmed lost quantities. Access to both warehouses is required;
            inter-business transfers are blocked.
          </>
        }
      />
      <WarehouseSelect
        label="Transfer warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={(v) => {
          setWarehouseId(v);
          setTransferId('');
          setOffset(0);
        }}
      />

      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}

      {!state.data && <View>{toolbar}</View>}
      {state.data && (
        <>
          <RecordCollection
            toolbar={toolbar}
            label="transfers"
            onOpen={setTransferId}
            items={state.data.workspace.transfers.map((t) => ({
              id: t.id,
              title: t.reference,
              subtitle: `${locations.find((l) => l.id === t.sourceWarehouseId)?.name ?? 'Source warehouse'} → ${locations.find((l) => l.id === t.destinationWarehouseId)?.name ?? 'Destination warehouse'}`,
              detail: new Date(t.createdAt).toLocaleDateString(),
              status: t.state.replaceAll('_', ' '),
              tone:
                t.state === 'completed'
                  ? 'success'
                  : t.state === 'cancelled'
                    ? 'neutral'
                    : 'warning',
            }))}
          />
          <Pagination
            label="transfers"
            offset={offset}
            pageSize={25}
            hasMore={state.data?.workspace.hasMore ?? false}
            busy={state.busy || (!state.data && !state.error)}
            onChange={setOffset}
          />
          {forms.slice(0, 1).map((f) => (
            <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
          ))}
          <SidePanel title="Transfer details" open={!!transferId} onClose={() => setTransferId('')}>
            {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
            {state.data.detail && (
              <TransferDetails detail={state.data.detail} timeZone={business.timeZone} />
            )}
            {forms.slice(1).map((f) => (
              <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
            ))}
          </SidePanel>
        </>
      )}
    </ScreenBody>
  );
}
