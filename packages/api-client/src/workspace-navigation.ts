import { canReadAccounting } from './accounting-forms.js';
import { hasPermission } from '@inventory/contracts';
import type { Business, Permission } from '@inventory/contracts';
export interface WorkspaceRoute {
  path: string;
  title: string;
  group: string;
  permissions: Permission[];
  panel?: string;
}
export const workspaceRoutes: WorkspaceRoute[] = [
  { path: '/dashboard', title: 'Overview', group: 'Overview', permissions: [] },
  { path: '/pos', title: 'Point of sale', group: 'Sales', permissions: ['sales.write'] },
  { path: '/sales', title: 'Sales & receipts', group: 'Sales', permissions: ['sales.read'] },
  { path: '/cash', title: 'Cash shifts', group: 'Sales', permissions: ['payments.read'] },
  {
    path: '/catalog',
    title: 'Catalog & pricing',
    group: 'Inventory',
    permissions: ['products.read'],
    panel: 'catalog',
  },
  {
    path: '/inventory',
    title: 'Inventory',
    group: 'Inventory',
    permissions: ['stock.read'],
    panel: 'inventory',
  },
  {
    path: '/warehouse',
    title: 'Stock counts & scanning',
    group: 'Inventory',
    permissions: ['stock.read'],
    panel: 'warehouse',
  },
  {
    path: '/transfers',
    title: 'Transfers',
    group: 'Inventory',
    permissions: ['stock.read'],
    panel: 'transfers',
  },
  {
    path: '/storage',
    title: 'Storage locations',
    group: 'Inventory',
    permissions: ['stock.read'],
    panel: 'storage',
  },
  {
    path: '/warehouse-view',
    title: 'Warehouse hierarchy',
    group: 'Inventory',
    permissions: ['stock.read'],
    panel: 'warehouse-view',
  },
  {
    path: '/purchasing',
    title: 'Purchasing & suppliers',
    group: 'Purchasing',
    permissions: ['purchases.read'],
    panel: 'purchasing',
  },
  {
    path: '/customers',
    title: 'Customers',
    group: 'Customers',
    permissions: ['customers.read'],
    panel: 'customers',
  },
  {
    path: '/payables',
    title: 'Supplier balances',
    group: 'Finance',
    permissions: ['purchases.read', 'payments.read'],
    panel: 'payables',
  },
  {
    path: '/accounting',
    title: 'Accounting',
    group: 'Finance',
    permissions: ['reports.read', 'payments.read', 'sales.read', 'purchases.read'],
    panel: 'accounting',
  },
  {
    path: '/reports',
    title: 'Reports',
    group: 'Reports',
    permissions: ['reports.read'],
    panel: 'reports',
  },
  { path: '/logs', title: 'Logs', group: 'Administration', permissions: ['audit.read'] },
  {
    path: '/notifications',
    title: 'Notifications & approvals',
    group: 'Administration',
    permissions: ['business.read'],
    panel: 'notifications',
  },
  {
    path: '/trading',
    title: 'Business trading',
    group: 'Administration',
    permissions: ['business.write'],
    panel: 'trading',
  },
  {
    path: '/integrations',
    title: 'Integrations & help',
    group: 'Administration',
    permissions: ['business.read'],
    panel: 'integrations',
  },
  { path: '/settings/profile', title: 'Profile', group: 'Settings', permissions: [] },
  {
    path: '/settings/company',
    title: 'Company profile',
    group: 'Settings',
    permissions: ['business.write'],
  },
  {
    path: '/settings/business',
    title: 'Business',
    group: 'Settings',
    permissions: ['business.write'],
  },
  { path: '/settings/preferences', title: 'Preferences', group: 'Settings', permissions: [] },
  { path: '/settings/security', title: 'Security', group: 'Settings', permissions: [] },
  {
    path: '/settings/device',
    title: 'Device & Offline',
    group: 'Settings',
    permissions: ['sales.write', 'stock.read'],
  },
  {
    path: '/settings/notifications',
    title: 'Security notifications',
    group: 'Settings',
    permissions: [],
  },
  {
    path: '/staff',
    title: 'Staff & expenses',
    group: 'Administration',
    permissions: ['users.write'],
  },
  {
    path: '/team',
    title: 'Team & permissions',
    group: 'Administration',
    permissions: ['users.read'],
  },
  {
    path: '/settings/locations',
    title: 'Stores & terminals',
    group: 'Settings',
    permissions: ['locations.write'],
  },
  {
    path: '/settings/audit',
    title: 'Audit history',
    group: 'Settings',
    permissions: ['audit.read'],
  },
];
export function routeAllowed(route: WorkspaceRoute, business?: Business) {
  if (route.path === '/dashboard' && business?.role === 'cashier') return false;
  return (
    route.permissions.length === 0 ||
    (!!business &&
      business.state === 'active' &&
      (route.path !== '/accounting' || canReadAccounting(business)) &&
      route.permissions.every((p) => hasPermission(business, p)))
  );
}
export function availableRoutes(business?: Business) {
  return workspaceRoutes.filter((route) => routeAllowed(route, business));
}

/** UI capability only; server scope and permissions remain authoritative. */
export function canSwitchWorkspace(business: Business | null | undefined, platformAdmin: boolean) {
  return (
    platformAdmin || !!(business?.state === 'active' && hasPermission(business, 'business.write'))
  );
}
export function overviewDestination(business: Business | null | undefined, platformAdmin: boolean) {
  if (platformAdmin) return '/admin';
  if (
    business?.state === 'active' &&
    business.role === 'cashier' &&
    hasPermission(business, 'sales.write')
  )
    return '/pos';
  return '/dashboard';
}
