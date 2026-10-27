import { z } from 'zod';
export const permissionSchema = z.enum([
  'business.read',
  'business.write',
  'locations.read',
  'locations.write',
  'products.read',
  'products.write',
  'stock.read',
  'stock.write',
  'sales.read',
  'sales.write',
  'sales.refund',
  'sales.void',
  'purchases.read',
  'purchases.write',
  'customers.read',
  'customers.write',
  'customers.credit',
  'customers.override',
  'payments.read',
  'payments.write',
  'payments.cash',
  'reports.read',
  'reports.write',
  'users.read',
  'users.write',
  'audit.read',
  'onlineStore.view',
  'onlineStore.manage',
  'onlineStore.orders',
]);
export type Permission = z.infer<typeof permissionSchema>;
export const assignableRoleSchema = z.enum(['owner', 'manager', 'cashier', 'viewer', 'custom']);
export const accessRoleSchema = z.enum(['super_admin', ...assignableRoleSchema.options]);
export type AccessRole = z.infer<typeof accessRoleSchema>;
export const accessScopeSchema = z
  .object({
    storeId: z.uuid().nullable().default(null),
    warehouseId: z.uuid().nullable().default(null),
  })
  .strict()
  .refine((s) => !s.warehouseId || !!s.storeId, 'Warehouse scope requires a store');
export const accessFields = {
  scope: accessScopeSchema.default({ storeId: null, warehouseId: null }),
  permissions: z.array(permissionSchema).max(permissionSchema.options.length).default([]),
};
export function rolePermissions(role: AccessRole, custom: Permission[] = []): Permission[] {
  switch (role) {
    case 'super_admin':
    case 'owner':
      return [...permissionSchema.options];
    case 'manager':
      return permissionSchema.options.filter(
        (p) =>
          ![
            'business.write',
            'users.read',
            'users.write',
            'onlineStore.manage',
            'onlineStore.orders',
          ].includes(p),
      );
    case 'cashier':
      return [
        'business.read',
        'locations.read',
        'products.read',
        'stock.read',
        'sales.read',
        'sales.write',
        'customers.read',
        'customers.write',
        'payments.read',
        'payments.write',
      ];
    case 'viewer':
      return ['business.read', 'locations.read'];
    case 'custom':
      return [...new Set(['business.read' as const, ...custom])];
    default:
      return [];
  }
}
export function hasPermission(
  access: { role: AccessRole; permissions?: Permission[] },
  permission: Permission,
) {
  const granted = rolePermissions(access.role, access.permissions);
  return (
    granted.includes(permission) ||
    (permission === 'onlineStore.view' && granted.includes('onlineStore.manage'))
  );
}
export function validAssignment(value: {
  role: string;
  scope: z.infer<typeof accessScopeSchema>;
  permissions: Permission[];
}) {
  if (value.role === 'owner' && value.scope.storeId) return false;
  if (value.role !== 'custom' && value.permissions.length) return false;
  if (value.permissions.includes('users.write')) return false; // Membership delegation stays owner-only.
  if (
    value.scope.storeId &&
    value.permissions.some((p) =>
      ['users.read', 'business.write', 'onlineStore.manage'].includes(p),
    )
  )
    return false;
  return true;
}
export function locationInScope(
  access: { scope?: { storeId: string | null; warehouseId: string | null } },
  location: { id: string; kind: string; storeId: string | null; warehouseId: string | null },
  writing = false,
) {
  const scope = access.scope;
  if (!scope?.storeId) return true;
  if (location.kind === 'stores')
    return location.id === scope.storeId && (!writing || !scope.warehouseId);
  if (location.storeId !== scope.storeId) return false;
  if (!scope.warehouseId) return true;
  return location.kind === 'warehouses'
    ? location.id === scope.warehouseId
    : location.warehouseId === scope.warehouseId;
}
export function creatableLocationKinds(access: {
  role: AccessRole;
  permissions?: Permission[];
  scope?: { storeId: string | null; warehouseId: string | null };
}) {
  if (!hasPermission(access, 'locations.write')) return [];
  return access.scope?.warehouseId
    ? ['terminals']
    : access.scope?.storeId
      ? ['warehouses', 'terminals']
      : ['stores', 'warehouses', 'terminals'];
}
