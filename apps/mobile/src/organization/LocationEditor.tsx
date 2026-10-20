import { hasPermission, creatableLocationKinds, locationInScope } from '@inventory/contracts';
import { useState } from 'react';
import { Text, View } from 'react-native';
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
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.heading}>
        Locations and devices
      </Text>
      {workspace.locations.map((item) => (
        <View key={item.id}>
          <Text>
            {item.name} · {item.code} · {item.type} · {item.state}
            {item.storeId &&
              ` · ${workspace.locations.find((parent) => parent.id === item.storeId)?.name ?? 'Store'}`}
            {item.warehouseId &&
              ` / ${workspace.locations.find((parent) => parent.id === item.warehouseId)?.name ?? 'Warehouse'}`}
          </Text>
          {writable &&
            locationInScope(workspace.business, item, true) &&
            item.state !== 'archived' && (
              <Action label={`Edit ${item.name}`} disabled={busy} onPress={() => edit(item)} />
            )}
        </View>
      ))}
      {!workspace.locations.length && <Text>No locations or terminals yet.</Text>}
      {writable && (
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
              })
            }
          />
          {editing && <Action label="Cancel edit" disabled={busy} onPress={() => edit(null)} />}
        </>
      )}
    </View>
  );
}
