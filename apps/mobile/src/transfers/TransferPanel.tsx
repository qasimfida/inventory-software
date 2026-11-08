import { ExportRecords } from '../ui/ExportRecords';
import { Choice } from '../ui/Controls';
import { EmptyState, ErrorState, LoadingState } from '../ui/AsyncState';
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
  const [storeId, setStoreId] = useState(warehouses[0]?.storeId ?? '');
  const stores = locations.filter((l) => l.kind === 'stores');
  const scopedWarehouses = warehouses.filter((w) => (w.storeId ?? '') === storeId);
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
        title="Transfers"
        actions={
          <>
            <Choice
              label="Transfer store"
              value={storeId}
              options={[
                ...stores.map((s) => ({ value: s.id, label: s.name })),
                ...(warehouses.some((w) => !w.storeId)
                  ? [{ value: '', label: 'Business warehouses' }]
                  : []),
              ]}
              onChange={(value) => {
                setStoreId(value);
                setWarehouseId(warehouses.find((w) => (w.storeId ?? '') === value)?.id ?? '');
                setTransferId('');
                setOffset(0);
              }}
            />{' '}
            <WarehouseSelect
              label="Transfer warehouse"
              value={warehouseId}
              options={scopedWarehouses.map((w) => ({ value: w.id, label: w.name }))}
              onChange={(v) => {
                setWarehouseId(v);
                setTransferId('');
                setOffset(0);
              }}
            />
            <ExportRecords
              name="transfers"
              headers={[
                'Reference',
                'Source warehouse',
                'Destination warehouse',
                'Created',
                'Status',
              ]}
              rows={(state.data?.workspace.transfers ?? []).map((t) => [
                t.reference,
                locations.find((l) => l.id === t.sourceWarehouseId)?.name ?? t.sourceWarehouseId,
                locations.find((l) => l.id === t.destinationWarehouseId)?.name ??
                  t.destinationWarehouseId,
                t.createdAt,
                t.state,
              ])}
            />
            {forms.slice(0, 1).map((f) => (
              <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
            ))}
          </>
        }
        description={
          <>
            Approval reserves stock. Dispatch moves it into transit. Receipt records good, damaged
            and explicitly confirmed lost quantities. Access to both warehouses is required;
            inter-business transfers are blocked.
          </>
        }
      />

      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}

      {!warehouseId && (
        <EmptyState
          message="No active warehouse"
          description="Request access to an active warehouse to view and manage transfers."
        />
      )}
      {warehouseId && !state.data && !state.error && <LoadingState message="Loading transfers…" />}
      {!state.data && <View>{toolbar}</View>}
      {state.data && (
        <>
          <RecordCollection
            showExport={false}
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
          <SidePanel title="Transfer details" open={!!transferId} onClose={() => setTransferId('')}>
            {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
            {state.data.detail && (
              <TransferDetails
                detail={state.data.detail}
                timeZone={business.timeZone}
                locations={locations}
              />
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
