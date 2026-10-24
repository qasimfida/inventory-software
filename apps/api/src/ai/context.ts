import { hasPermission } from '@inventory/contracts';
import type { Business, Permission } from '@inventory/contracts';
const sections: { label: string; permissions: Permission[] }[] = [
  { label: 'Reports and dashboard', permissions: ['reports.read'] },
  { label: 'Notifications and approvals', permissions: ['business.read'] },
  { label: 'Business trading', permissions: ['business.write'] },
  { label: 'Catalog and pricing', permissions: ['products.read'] },
  { label: 'Inventory and warehouse operations', permissions: ['stock.read'] },
  { label: 'Purchasing', permissions: ['purchases.read'] },
  { label: 'Customers', permissions: ['customers.read'] },
  { label: 'Sales and receipts', permissions: ['sales.read'] },
  { label: 'Supplier balances', permissions: ['purchases.read', 'payments.read'] },
];
// Only static navigation labels leave the authorization boundary. Future retrieval
// must use a dedicated scoped business-service adapter, never an unrestricted DB handle.
export function allowedSections(business: Business) {
  return sections
    .filter((s) => s.permissions.every((p) => hasPermission(business, p)))
    .map((s) => s.label);
}
