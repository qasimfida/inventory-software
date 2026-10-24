import { SearchControl } from '@/components/common/SearchControl';
import { RecordCollection } from '@/components/common/RecordCollection';
import { FormSheet } from '@/components/common/FormSheet';
import { EmptyState } from '@/components/common/AsyncState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { hasPermission, creatableLocationKinds, locationInScope } from '@inventory/contracts';
import { useState } from 'react';
import { createLocationSchema, editLocationSchema } from '@inventory/contracts';
import type { Location, Workspace } from '@inventory/contracts';
import type { OrganizationModel } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
export function LocationEditor({
  model,
  workspace,
  busy,
}: {
  model: OrganizationModel;
  workspace: Workspace;
  busy: boolean;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(''),
    [viewing, setViewing] = useState<Location | null>(null);
  const kinds = creatableLocationKinds(workspace.business);
  const [kind, setKind] = useState(kinds[0] ?? 'stores');
  const [storeId, setStoreId] = useState(workspace.business.scope?.storeId ?? '');
  const [editing, setEditing] = useState<Location | null>(null);
  const writable = hasPermission(workspace.business, 'locations.write');
  const stores = workspace.locations.filter(
    (item) => item.kind === 'stores' && item.state === 'active',
  );
  const toolbar = (
    <>
      <div className="collection-search">
        <SearchControl
          label="Search locations"
          value={search}
          onChange={setSearch}
          suggestions={[]}
        />
      </div>
    </>
  );
  return (
    <section className="screen-section" aria-label="Stores warehouses and terminals">
      <ScreenHeader title="Locations and devices" level={3} />
      {writable && (
        <Button
          disabled={busy}
          onClick={() => {
            setEditing(null);
            setViewing(null);
            setOpen(true);
          }}
        >
          Add store / warehouse / terminal
        </Button>
      )}

      <RecordCollection
        toolbar={toolbar}
        label="locations"
        onOpen={(id) => {
          const item = workspace.locations.find((l) => l.id === id);
          if (!item) return;
          if (
            writable &&
            locationInScope(workspace.business, item, true) &&
            item.state !== 'archived'
          ) {
            setEditing(item);
            setViewing(null);
          } else {
            setEditing(null);
            setViewing(item);
          }
          setOpen(true);
        }}
        items={workspace.locations
          .filter((l) =>
            `${l.name} ${l.code} ${l.type}`.toLowerCase().includes(search.toLowerCase()),
          )
          .map((item) => ({
            id: item.id,
            title: item.name,
            subtitle: `${item.code} · ${item.type}`,
            detail:
              workspace.locations.find((parent) => parent.id === item.storeId)?.name ??
              'Business location',
            status: item.state,
            tone: item.state === 'active' ? 'success' : 'neutral',
          }))}
        columns={['Location', 'Code / type', 'Parent store']}
      />
      {!workspace.locations.length && <EmptyState message="No locations or terminals yet." />}
      <FormSheet
        title={viewing?.name ?? (editing ? `Edit ${editing.name}` : 'Add location')}
        open={open}
        onOpenChange={setOpen}
      >
        {viewing && (
          <p>
            {viewing.name} · {viewing.code} · {viewing.type} · {viewing.state}
          </p>
        )}
        {writable && !viewing && (
          <form
            key={editing?.id ?? 'new'}
            className="screen-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              void model.refresh(async () => {
                const fields = { name: data.get('name'), code: data.get('code') };
                if (editing)
                  await model.client.editLocation(
                    workspace.business.id,
                    editing.kind,
                    editing.id,
                    editLocationSchema.parse({
                      ...fields,
                      state: data.get('state'),
                      version: editing.version,
                    }),
                  );
                else
                  await model.client.createLocation(
                    workspace.business.id,
                    createLocationSchema.parse({
                      ...fields,
                      kind,
                      ...(kind !== 'stores'
                        ? { storeId: data.get('storeId') }
                        : { type: data.get('type') }),
                      ...(kind === 'terminals'
                        ? { type: data.get('type'), warehouseId: data.get('warehouseId') || null }
                        : {}),
                    }),
                  );
                setEditing(null);
                setOpen(false);
                form.reset();
              });
            }}
          >
            <fieldset disabled={busy} className="screen-form">
              <legend>{editing ? `Edit ${editing.name}` : 'Create location or terminal'}</legend>
              {!editing && (
                <>
                  <label htmlFor="location-kind">Entity</label>
                  <Select
                    id="location-kind"
                    value={kind}
                    onChange={(event) => {
                      setKind(event.target.value);
                      setStoreId('');
                    }}
                  >
                    {kinds.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </Select>
                </>
              )}
              <label htmlFor="location-name">Location or terminal name</label>
              <Input
                id="location-name"
                name="name"
                defaultValue={editing?.name ?? ''}
                required
                maxLength={120}
              />
              <label htmlFor="location-code">Code (letters, numbers, underscore or hyphen)</label>
              <Input
                id="location-code"
                name="code"
                defaultValue={editing?.code ?? ''}
                required
                pattern="[A-Za-z0-9_-]{1,32}"
                maxLength={32}
              />
              {!editing && kind !== 'warehouses' && (
                <>
                  <label htmlFor="location-type">Type</label>
                  <Select id="location-type" name="type">
                    {(kind === 'stores' ? ['store', 'branch'] : ['pos', 'desktop', 'mobile']).map(
                      (type) => (
                        <option key={type}>{type}</option>
                      ),
                    )}
                  </Select>
                </>
              )}
              {!editing && kind !== 'stores' && (
                <>
                  <label htmlFor="parent-store">Parent store</label>
                  <Select
                    id="parent-store"
                    name="storeId"
                    value={storeId}
                    onChange={(event) => setStoreId(event.target.value)}
                    required
                  >
                    <option value="">Choose store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </Select>
                </>
              )}
              {!editing && kind === 'terminals' && (
                <>
                  <label htmlFor="parent-warehouse">Warehouse (optional)</label>
                  <Select id="parent-warehouse" name="warehouseId" key={storeId}>
                    <option value="">No warehouse</option>
                    {workspace.locations
                      .filter(
                        (item) =>
                          item.kind === 'warehouses' &&
                          item.storeId === storeId &&
                          item.state === 'active',
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </Select>
                </>
              )}
              {editing && (
                <>
                  <label htmlFor="location-state">Location state</label>
                  <Select id="location-state" name="state" defaultValue={editing.state}>
                    {['active', 'suspended', 'archived'].map((state) => (
                      <option key={state}>{state}</option>
                    ))}
                  </Select>
                  <p className="text-sm">
                    Deactivate dependent terminals and warehouses first. Archiving is permanent;
                    parent relationships stay fixed.
                  </p>
                </>
              )}
              <Button type="submit">{editing ? 'Save location' : 'Create location'}</Button>
              {editing && (
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancel edit
                </Button>
              )}
            </fieldset>
          </form>
        )}
      </FormSheet>
    </section>
  );
}
