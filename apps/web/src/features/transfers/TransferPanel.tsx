import { ExportRecords } from '@/components/common/ExportRecords';
import { Select } from '@/components/ui/FormControls';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { RecordCollection } from '@/components/common/RecordCollection';
import { FormSheet } from '@/components/common/FormSheet';
import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { TransferDetails } from './TransferDetails';
import { ScreenHeader } from '@/components/common/ScreenHeader';
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
import { CommandForm } from '@/components/common/CommandForm';
import { IconButton } from '@/components/common/IconButton';
import { authClient } from '@/platform/auth-client';
const operationKey = () => crypto.randomUUID();
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
      <div className="collection-search">
        <SearchControl
          label="Search transfer reference / item"
          suggestions={
            state.data?.workspace.transfers.map((item) => ({
              value: item.reference,
              label: item.reference,
            })) ?? []
          }
          busy={state.busy || (!state.data && !state.error)}
          emptyMessage="No matching records. Try another name or code."
          value={search}
          onChange={(value) => {
            setSearch(value);
            setOffset(0);
          }}
        />
      </div>
      <IconButton
        label="Refresh transfers"
        icon={RefreshCw}
        onClick={() => void model.run()}
        disabled={state.busy || !warehouseId}
      />
    </>
  );
  return (
    <section aria-label="Stock transfers" className="screen-section">
      <ScreenHeader
        title="Transfers"
        actions={
          <>
            <Select
              aria-label="Transfer store"
              value={storeId}
              onChange={(e) => {
                const value = e.target.value;
                setStoreId(value);
                setWarehouseId(warehouses.find((w) => (w.storeId ?? '') === value)?.id ?? '');
                setTransferId('');
                setOffset(0);
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {warehouses.some((w) => !w.storeId) && <option value="">Business warehouses</option>}
            </Select>
            <WarehouseSelect
              label="Transfer warehouse"
              id="transfer-warehouse"
              value={warehouseId}
              onChange={(e) => {
                setWarehouseId(e.target.value);
                setTransferId('');
                setOffset(0);
              }}
            >
              {scopedWarehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </WarehouseSelect>
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
              <CommandForm
                primary
                key={f.title}
                definition={f}
                run={(work) => void model.run(work)}
              />
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
      {!state.data && <div className="collection-toolbar">{toolbar}</div>}
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
            columns={['Transfer', 'Route', 'Created']}
          />
          <Pagination
            label="transfers"
            offset={offset}
            pageSize={25}
            hasMore={state.data?.workspace.hasMore ?? false}
            busy={state.busy || (!state.data && !state.error)}
            onChange={setOffset}
          />
          <FormSheet
            title="Transfer details"
            description="Review the route, quantities and recorded history. Authorized actions are available below."
            open={!!transferId}
            onOpenChange={(open) => {
              if (!open) setTransferId('');
            }}
          >
            <div className="min-w-0 shrink-0 space-y-3">
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
            </div>
          </FormSheet>
        </>
      )}
    </section>
  );
}
