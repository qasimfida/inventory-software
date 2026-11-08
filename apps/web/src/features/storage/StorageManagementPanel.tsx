import * as Tabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';
import { ExportRecords } from '@/components/common/ExportRecords';
import { StorageDetails } from './StorageDetails';
import { WarehouseBalances } from './WarehouseBalances';
import { LoadingState, ErrorState } from '@/components/common/AsyncState';
import { RecordCollection } from '@/components/common/RecordCollection';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { Panel } from '@/components/common/Layout';
import { IconButton } from '@/components/common/IconButton';
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
import { CommandForm } from '@/components/common/CommandForm';
import { authClient } from '@/platform/auth-client';
const operationKey = () => crypto.randomUUID();
export function StorageManagementPanel({
  business,
  locations,
  warehouseId,
  renderHeader,
  renderBody,
}: {
  business: Business;
  locations: Location[];
  warehouseId: string;
  renderHeader: (actions: ReactNode) => ReactNode;
  renderBody?: ((revision: number) => ReactNode) | undefined;
}) {
  const [revision, setRevision] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState('');
  const activeWarehouse = locations.some((l) => l.id === warehouseId && l.state === 'active');
  const [search, setSearch] = useState(''),
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
        ...(activeWarehouse && hasPermission(business, 'locations.write')
          ? storageForms(client, state.data.storage, warehouseId)
          : []),
        ...(activeWarehouse && hasPermission(business, 'stock.write')
          ? [storageMoveForm(client, state.data.storage, state.data.stock, warehouseId)]
          : []),
      ]
    : [];
  const run = (work: () => Promise<unknown>) =>
    void model.run(async () => {
      const result = await work();
      setRevision((value) => value + 1);
      return result;
    });
  const pageActions = (
    <>
      <ExportRecords
        name="storage-locations-loaded"
        label="Export locations"
        headers={['Name', 'Code', 'Type', 'Status']}
        rows={(state.data?.storage.locations ?? []).map((l) => [l.name, l.code, l.type, l.state])}
      />
      {forms
        .filter((f) => !f.title.startsWith('Save location '))
        .map((f) => (
          <CommandForm key={f.title} definition={f} run={run} />
        ))}
    </>
  );
  return (
    <section aria-label="Storage locations" className="screen-section">
      {renderHeader(pageActions)}
      <Tabs.Content value={renderBody ? 'Browse hierarchy' : 'Locations'} className="space-y-4">
        {!state.data && !state.error && <LoadingState message="Loading storage locations…" />}
        {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
        {renderBody ? (
          renderBody(revision)
        ) : (
          <>
            <Panel aria-label="Locations" className="[&_table]:min-w-[36rem]">
              <RecordCollection
                showExport={false}
                toolbar={
                  <>
                    <div className="collection-search">
                      <SearchControl
                        label="Search storage code / name"
                        suggestions={
                          state.data?.storage.locations.map((item) => ({
                            value: item.code,
                            label: `${item.code} · ${item.name}`,
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
                      label="Refresh storage"
                      icon={RefreshCw}
                      onClick={() => void model.run()}
                      disabled={state.busy}
                    />
                  </>
                }
                actions={
                  <>
                    {state.data && (
                      <WarehouseBalances
                        totals={state.data.storage.totals}
                        items={state.data.stock.items}
                      />
                    )}
                  </>
                }
                label="storage locations"
                columns={['Name', 'Code', 'Type / parent']}
                onOpen={(id) => {
                  setSelectedLocation(id);
                }}
                items={(state.data?.storage.locations ?? []).map((l) => ({
                  id: l.id,
                  title: l.name,
                  subtitle: l.code,
                  detail: `${l.type} · ${state.data!.storage.locations.find((parent) => parent.id === l.parentId)?.name ?? (l.parentId ? 'Parent outside this page' : 'Warehouse root')}`,
                  status: l.state,
                  tone: l.state === 'active' ? 'success' : 'neutral',
                }))}
              />
              <Pagination
                label="locations"
                offset={offset}
                pageSize={50}
                hasMore={state.data?.storage.hasMore ?? false}
                busy={state.busy || (!state.data && !state.error)}
                onChange={setOffset}
              />
            </Panel>
            {state.data && (
              <>
                <StorageDetails
                  key={selectedLocation}
                  storage={state.data.storage}
                  selectedId={selectedLocation}
                  forms={forms}
                  close={() => setSelectedLocation('')}
                  run={run}
                />
              </>
            )}
          </>
        )}
      </Tabs.Content>
    </section>
  );
}
