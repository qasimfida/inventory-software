import { permissionSchema, rolePermissions } from '@inventory/contracts';
import type { Permission, AccessRole } from '@inventory/contracts';
const areas: Record<string, string> = {
  business: 'Business settings',
  locations: 'Stores and warehouses',
  products: 'Products and pricing',
  stock: 'Inventory and transfers',
  sales: 'Sales and receipts',
  purchases: 'Purchasing',
  customers: 'Customers and credit',
  payments: 'Payments',
  reports: 'Reports',
  users: 'Team',
  audit: 'Audit history',
};
const actions: Record<string, string> = {
  read: 'View',
  write: 'Create and edit',
  refund: 'Issue refunds',
  void: 'Void sales',
  credit: 'Manage credit limits',
  override: 'Override credit controls',
  cash: 'Operate cash shifts',
};
export function permissionLabel(permission: Permission) {
  const [area = '', action = ''] = permission.split('.');
  return `${actions[action] ?? action} · ${areas[area] ?? area}`;
}
/** Presentation of existing assignable grants, not backend authorization. */
export function permissionGroups(storeScoped: boolean) {
  const allowed = permissionSchema.options.filter(
    (p) => p !== 'users.write' && (!storeScoped || !['users.read', 'business.write'].includes(p)),
  );
  return Object.entries(areas)
    .map(([key, label]) => ({
      key,
      label,
      permissions: allowed.filter((p) => p.startsWith(`${key}.`)),
    }))
    .filter((group) => group.permissions.length);
}
export const roleGuidance: Record<string, string> = {
  owner:
    'Full business administration, including people and access. Owners cannot be limited to one store.',
  manager:
    'Operational management within the selected business, store or warehouse; no role delegation.',
  cashier: 'Checkout, customer records and payment records within the selected scope.',
  viewer: 'Read-only access to business information and locations within the selected scope.',
  custom:
    'Choose only the capabilities this person needs. Sensitive financial actions are separate grants.',
};
export function roleCapabilities(role: AccessRole) {
  return rolePermissions(role).map(permissionLabel);
}
