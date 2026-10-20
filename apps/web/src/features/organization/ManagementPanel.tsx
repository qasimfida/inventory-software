import { WarehousePanel } from '../warehouse/WarehousePanel';
import { PosPanel } from '../pos/PosPanel';
import { CustomerPanel } from '../customers/CustomerPanel';
import { TransferPanel } from '../transfers/TransferPanel';
import { StoragePanel } from '../storage/StoragePanel';
import { PurchasingPanel } from '../purchasing/PurchasingPanel';
import { InventoryPanel } from '../inventory/InventoryPanel';
import { CatalogPanel } from '../catalog/CatalogPanel';
import { AuditHistory } from './AuditHistory';
import { hasPermission } from '@inventory/contracts';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createOrganizationClient, OrganizationModel } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
import { BusinessEditor } from './BusinessEditor';
import { LocationEditor } from './LocationEditor';
import { MemberEditor } from './MemberEditor';
export function ManagementPanel() {
  const [checkout, setCheckout] = useState(false);
  const model = useMemo(
    () => new OrganizationModel(createOrganizationClient(authClient.organizationRequest)),
    [],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    void model.refresh();
    const timer = setInterval(() => void model.revalidate(), 60000);
    return () => {
      clearInterval(timer);
      model.reset();
    };
  }, [model]);
  const selected = state.businesses.find((b) => b.id === state.selectedId);
  if (
    checkout &&
    selected &&
    state.workspace &&
    (hasPermission(selected, 'sales.write') ||
      hasPermission(selected, 'sales.read') ||
      hasPermission(selected, 'payments.read'))
  )
    return (
      <PosPanel
        key={JSON.stringify([selected, state.workspace.locations])}
        business={selected}
        locations={state.workspace.locations}
        close={() => setCheckout(false)}
      />
    );
  return (
    <section aria-label="Organization management" className="space-y-4 border-t pt-4">
      <h2>Business management</h2>
      <p className="text-sm">
        Online only. Branches are stores; every warehouse and terminal belongs to one business and
        store.
      </p>
      {state.error && <p role="alert">{state.error}</p>}
      {state.busy && <p role="status">Updating management data…</p>}
      <Button variant="outline" disabled={state.busy} onClick={() => void model.refresh()}>
        Refresh businesses
      </Button>
      <form
        className="space-y-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const name = String(new FormData(form).get('name'));
          void model.refresh(async () => {
            const created = await model.client.create(name);
            form.reset();
            return created.id;
          });
        }}
      >
        <label htmlFor="new-business">New business name</label>
        <Input id="new-business" name="name" required maxLength={120} disabled={state.busy} />
        <Button type="submit" disabled={state.busy}>
          Create business
        </Button>
      </form>
      {!state.businesses.length && !state.busy && (
        <p>No active memberships. Create a business or ask an owner to assign your account.</p>
      )}
      <ul className="space-y-2">
        {state.businesses.map((b) => (
          <li key={b.id}>
            <Button
              variant={b.id === state.selectedId ? 'default' : 'outline'}
              disabled={state.busy}
              onClick={() => void model.select(b.id)}
            >
              {b.name} · {b.state} · {b.role}
            </Button>
          </li>
        ))}
      </ul>
      {selected && (
        <>
          <h3>{selected.name}</h3>
          {state.workspace &&
            (hasPermission(selected, 'sales.write') ||
              hasPermission(selected, 'sales.read') ||
              hasPermission(selected, 'payments.read')) && (
              <Button onClick={() => setCheckout(true)}>Open point of sale</Button>
            )}
          {hasPermission(selected, 'business.write') && (
            <BusinessEditor
              key={`${selected.id}-${selected.version}`}
              business={selected}
              model={model}
              busy={state.busy}
            />
          )}
          {selected.state !== 'active' && (
            <p>
              This business is {selected.state}. Child management is locked. Archived records cannot
              be restored.
            </p>
          )}
          {state.workspace && (
            <>
              {hasPermission(selected, 'customers.read') && (
                <CustomerPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'products.read') && (
                <CatalogPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'stock.read') && (
                <WarehousePanel
                  key={JSON.stringify(selected)}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'stock.read') && (
                <TransferPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'purchases.read') && (
                <PurchasingPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'stock.read') && (
                <StoragePanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              {hasPermission(selected, 'stock.read') && (
                <InventoryPanel
                  key={JSON.stringify([selected, state.workspace.locations])}
                  business={selected}
                  locations={state.workspace.locations}
                />
              )}
              <LocationEditor model={model} workspace={state.workspace} busy={state.busy} />
              {hasPermission(selected, 'users.read') && (
                <MemberEditor model={model} workspace={state.workspace} busy={state.busy} />
              )}
            </>
          )}
          {hasPermission(selected, 'audit.read') && (
            <>
              <Button disabled={state.busy} variant="outline" onClick={() => void model.audit()}>
                View audit history
              </Button>
              <AuditHistory events={state.events} timeZone={selected.timeZone ?? 'UTC'} />
              {state.nextCursor && (
                <Button disabled={state.busy} onClick={() => void model.audit(true)}>
                  More audit events
                </Button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
