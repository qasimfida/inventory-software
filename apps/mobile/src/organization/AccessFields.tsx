import { Text, Switch, View } from 'react-native';
import { permissionSchema } from '@inventory/contracts';
import type { Permission, Workspace } from '@inventory/contracts';
import { Choice } from './Controls';
export interface AssignmentAccess {
  scope: { storeId: string | null; warehouseId: string | null };
  permissions: Permission[];
}
export function AccessFields({
  role,
  value,
  onChange,
  workspace,
  busy,
}: {
  role: string;
  value: AssignmentAccess;
  onChange: (value: AssignmentAccess) => void;
  workspace: Workspace;
  busy: boolean;
}) {
  return (
    <>
      {role !== 'owner' && (
        <>
          <Choice
            label="Access scope: store"
            value={value.scope.storeId ?? ''}
            disabled={busy}
            options={[
              { value: '', label: 'Entire business' },
              ...workspace.locations
                .filter((l) => l.kind === 'stores' && l.state === 'active')
                .map((l) => ({ value: l.id, label: l.name })),
            ]}
            onChange={(id) =>
              onChange({ permissions: [], scope: { storeId: id || null, warehouseId: null } })
            }
          />
          {value.scope.storeId && (
            <Choice
              label="Access scope: warehouse"
              value={value.scope.warehouseId ?? ''}
              disabled={busy}
              options={[
                { value: '', label: 'Entire store' },
                ...workspace.locations
                  .filter(
                    (l) =>
                      l.kind === 'warehouses' &&
                      l.storeId === value.scope.storeId &&
                      l.state === 'active',
                  )
                  .map((l) => ({ value: l.id, label: l.name })),
              ]}
              onChange={(id) =>
                onChange({ ...value, scope: { ...value.scope, warehouseId: id || null } })
              }
            />
          )}
        </>
      )}
      {role === 'custom' && (
        <View>
          <Text accessibilityRole="header">Custom permissions</Text>
          {permissionSchema.options
            .filter(
              (p) =>
                p !== 'users.write' &&
                (!value.scope.storeId || !['users.read', 'business.write'].includes(p)),
            )
            .map((p) => (
              <View key={p}>
                <Text>{p}</Text>
                <Switch
                  accessibilityLabel={p}
                  disabled={busy}
                  value={value.permissions.includes(p)}
                  onValueChange={(enabled) =>
                    onChange({
                      ...value,
                      permissions: enabled
                        ? [...value.permissions, p]
                        : value.permissions.filter((item) => item !== p),
                    })
                  }
                />
              </View>
            ))}
        </View>
      )}
    </>
  );
}
