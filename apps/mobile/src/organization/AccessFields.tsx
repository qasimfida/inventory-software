import { Text } from '../ui/Themed';
import { View } from 'react-native';
import {
  permissionGroups,
  permissionLabel,
  roleGuidance,
  roleCapabilities,
} from '@inventory/api-client';
import { assignableRoleSchema } from '@inventory/contracts';
import { FormSection } from '../ui/FormSection';
import { Checkbox } from '../ui/Checkbox';
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
  const parsedRole = assignableRoleSchema.safeParse(role);
  return (
    <>
      <Text tone="muted">{roleGuidance[role]}</Text>
      {parsedRole.success && role !== 'custom' && (
        <FormSection title="View included permissions">
          {roleCapabilities(parsedRole.data).map((label) => (
            <Text key={label}>{label}</Text>
          ))}
        </FormSection>
      )}
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
          {permissionGroups(!!value.scope.storeId).map((group) => (
            <FormSection
              key={group.key}
              title={`${group.label} · ${group.permissions.filter((p) => value.permissions.includes(p)).length} selected`}
            >
              {group.permissions.map((permission) => (
                <Checkbox
                  key={permission}
                  label={permissionLabel(permission)}
                  disabled={busy}
                  value={value.permissions.includes(permission)}
                  onChange={(enabled) =>
                    onChange({
                      ...value,
                      permissions: enabled
                        ? [...value.permissions, permission]
                        : value.permissions.filter((p) => p !== permission),
                    })
                  }
                />
              ))}
            </FormSection>
          ))}
        </View>
      )}
    </>
  );
}
