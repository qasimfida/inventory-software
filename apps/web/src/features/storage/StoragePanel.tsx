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
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
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
    <section aria-label="Storage locations" className="space-y-3 border-t pt-4">
      <h2>Storage locations</h2>
      <p>
        Capacity is descriptive metadata. Moves relocate available undamaged stock. Barcode labels
        encode the location UUID; scan quality requires device validation.
      </p>
      <label htmlFor="storage-warehouse">Storage warehouse</label>
      <Select
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
      </Select>
      <label htmlFor="storage-search">Search storage code / name</label>
      <Input
        id="storage-search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOffset(0);
        }}
      />
      {state.error && <p role="alert">{state.error}</p>}
      <Button onClick={() => void model.run()} disabled={state.busy || !warehouseId}>
        Refresh storage
      </Button>
      {state.data && (
        <>
          <Button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 50))}>
            Previous storage page
          </Button>
          <Button disabled={!state.data.storage.hasMore} onClick={() => setOffset(offset + 50)}>
            Next storage page
          </Button>
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
