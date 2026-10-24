import { RecordCollection } from '@/components/common/RecordCollection';
import { FormSheet } from '@/components/common/FormSheet';
import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { TransferDetails } from './TransferDetails';
import { Grid } from '@/components/common/Layout';
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
import { Button } from '@/components/ui/Button';
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
      <Button
        onClick={() => void model.run()}
        disabled={state.busy || !warehouseId}
        variant="ghost"
        size="icon"
        aria-label="Refresh transfers"
        title="Refresh"
      >
        <RefreshCw aria-hidden="true" />
      </Button>
    </>
  );
  return (
    <section aria-label="Stock transfers" className="screen-section">
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
      <Grid className="screen-filters">
        <div>
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
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </WarehouseSelect>
        </div>
      </Grid>
      {state.error && <p role="alert">{state.error}</p>}

      {!state.data && <div className="collection-toolbar">{toolbar}</div>}
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
          {forms.slice(0, 1).map((f) => (
            <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
          ))}
          <FormSheet
            title="Transfer details"
            open={!!transferId}
            onOpenChange={(open) => {
              if (!open) setTransferId('');
            }}
          >
            {state.error && <p role="alert">{state.error}</p>}
            {state.data.detail && (
              <TransferDetails detail={state.data.detail} timeZone={business.timeZone} />
            )}
            {forms.slice(1).map((f) => (
              <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
            ))}
          </FormSheet>
        </>
      )}
    </section>
  );
}
