import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { Grid } from '@/components/common/Layout';
import { ScreenHeader } from '@/components/common/ScreenHeader';
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
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { authClient } from '@/platform/auth-client';
const operationKey = () => crypto.randomUUID();
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
    <section aria-label="Storage locations" className="screen-section">
      <ScreenHeader
        title="Storage locations"
        description={
          <>
            Capacity is descriptive metadata. Moves relocate available undamaged stock. Barcode
            labels encode the location UUID; scan quality requires device validation.
          </>
        }
      />
      <Grid className="screen-filters">
        <div>
          <WarehouseSelect
            label="Storage warehouse"
            id="storage-warehouse"
            value={warehouseId}
            onChange={(e) => {
              setWarehouseId(e.target.value);
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
        <div>
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
        <Button
          onClick={() => void model.run()}
          disabled={state.busy || !warehouseId}
          variant="ghost"
          size="icon"
          aria-label="Refresh storage"
          title="Refresh"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </Grid>
      {state.error && <p role="alert">{state.error}</p>}
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
            <div key={l.id}>
              <p>
                {l.name} · {l.type} · {l.state} · parent {l.parentId ?? 'none'}
              </p>
              <LocationLabel id={l.id} code={l.code} />
            </div>
          ))}
          {state.data.storage.totals.map((t) => (
            <p key={t.variantId}>
              {t.variantId} · warehouse on hand {t.onHand} · reserved {t.reserved} · damaged{' '}
              {t.damaged} · transit {t.inTransit}
            </p>
          ))}
          {forms.map((f) => (
            <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </section>
  );
}
