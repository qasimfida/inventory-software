import { SearchControl } from '../ui/SearchControl';
import { RecordCollection } from '../ui/RecordCollection';
import { SidePanel } from '../ui/SidePanel';
import { EmptyState } from '../ui/AsyncState';
import { Text } from '../ui/Themed';
import { hasPermission, creatableLocationKinds, locationInScope } from '@inventory/contracts';
import { useState } from 'react';
import { View } from 'react-native';
import { createLocationSchema, editLocationSchema } from '@inventory/contracts';
import type { Location, Workspace } from '@inventory/contracts';
import type { OrganizationModel } from '@inventory/api-client';
import { Action, Choice, choices, Field, styles } from './Controls';
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
  const [type, setType] = useState(workspace.business.scope?.storeId ? 'pos' : 'store');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [state, setState] = useState('active');
  const [storeId, setStoreId] = useState(workspace.business.scope?.storeId ?? '');
  const [warehouseId, setWarehouseId] = useState(workspace.business.scope?.warehouseId ?? '');
  const [editing, setEditing] = useState<Location | null>(null);
  function edit(item: Location | null) {
    setEditing(item);
    setName(item?.name ?? '');
    setCode(item?.code ?? '');
    setState(item?.state ?? 'active');
  }
  const writable = hasPermission(workspace.business, 'locations.write');
  const toolbar = (
    <>
      <View style={{ flexGrow: 1, flexBasis: 160 }}>
        <SearchControl
          label="Search locations"
          value={search}
          onChange={setSearch}
          suggestions={[]}
        />
      </View>
    </>
  );
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>
        Locations and devices
      </Text>
      <Action
        label="Add store / warehouse / terminal"
        disabled={!writable || busy}
        onPress={() => {
          edit(null);
          setViewing(null);
          setOpen(true);
        }}
      />

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
            edit(item);
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
      />
      {!workspace.locations.length && <EmptyState message="No locations or terminals yet." />}
      <SidePanel
        title={viewing?.name ?? (editing ? `Edit ${editing.name}` : 'Add location')}
        open={open}
        onClose={() => setOpen(false)}
      >
        {viewing && (
          <Text>
            {viewing.name} · {viewing.code} · {viewing.type} · {viewing.state}
          </Text>
        )}
        {writable && !viewing && (
          <>
            <Text accessibilityRole="header">
              {editing ? `Edit ${editing.name}` : 'Create location or terminal'}
            </Text>
            {!editing && (
              <Choice
                label="Entity"
                value={kind}
                options={choices(kinds)}
                onChange={(value) => {
                  setKind(value);
                  setType(value === 'stores' ? 'store' : 'pos');
                  setStoreId('');
                  setWarehouseId('');
                }}
                disabled={busy}
              />
            )}
            <Field
              label="Location or terminal name"
              value={name}
              onChange={setName}
              disabled={busy}
            />
            <Field
              label="Code (letters, numbers, underscore or hyphen)"
              value={code}
              onChange={setCode}
              disabled={busy}
            />
            {!editing && kind !== 'warehouses' && (
              <Choice
                label="Type"
                value={type}
                options={choices(
                  kind === 'stores' ? ['store', 'branch'] : ['pos', 'desktop', 'mobile'],
                )}
                onChange={setType}
                disabled={busy}
              />
            )}
            {!editing && kind !== 'stores' && (
              <Choice
                label="Parent store"
                value={storeId}
                options={workspace.locations
                  .filter((item) => item.kind === 'stores' && item.state === 'active')
                  .map((item) => ({ value: item.id, label: item.name }))}
                onChange={(value) => {
                  setStoreId(value);
                  setWarehouseId('');
                }}
                disabled={busy}
              />
            )}
            {!editing && kind === 'terminals' && (
              <Choice
                label="Warehouse (optional)"
                value={warehouseId}
                options={[
                  { value: '', label: 'No warehouse' },
                  ...workspace.locations
                    .filter(
                      (item) =>
                        item.kind === 'warehouses' &&
                        item.state === 'active' &&
                        item.storeId === storeId,
                    )
                    .map((item) => ({ value: item.id, label: item.name })),
                ]}
                onChange={setWarehouseId}
                disabled={busy}
              />
            )}
            {editing && (
              <>
                <Choice
                  label="Location state"
                  value={state}
                  options={choices(['active', 'suspended', 'archived'])}
                  onChange={setState}
                  disabled={busy}
                />
                <Text>
                  Deactivate dependent records first. Archiving is permanent; parent relationships
                  stay fixed.
                </Text>
              </>
            )}
            <Action
              label={editing ? 'Save location' : 'Create location'}
              disabled={busy}
              onPress={() =>
                void model.refresh(async () => {
                  if (editing)
                    await model.client.editLocation(
                      workspace.business.id,
                      editing.kind,
                      editing.id,
                      editLocationSchema.parse({ name, code, state, version: editing.version }),
                    );
                  else
                    await model.client.createLocation(
                      workspace.business.id,
                      createLocationSchema.parse({
                        kind,
                        name,
                        code,
                        ...(kind === 'stores' ? { type } : { storeId }),
                        ...(kind === 'terminals' ? { type, warehouseId: warehouseId || null } : {}),
                      }),
                    );
                  edit(null);
                  setOpen(false);
                })
              }
            />
            {editing && <Action label="Cancel edit" disabled={busy} onPress={() => edit(null)} />}
          </>
        )}
      </SidePanel>
    </View>
  );
}
