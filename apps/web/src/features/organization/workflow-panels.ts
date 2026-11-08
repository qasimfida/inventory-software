import { lazy } from 'react';
const CategoryPage = lazy(() =>
  import('../catalog/CategoryPage').then((m) => ({ default: m.CategoryPage })),
);
import type { Permission } from '@inventory/contracts';
const WarehousePanel = lazy(() =>
  import('../warehouse/WarehousePanel').then((m) => ({ default: m.WarehousePanel })),
);
const CustomerPanel = lazy(() =>
  import('../customers/CustomerPanel').then((m) => ({ default: m.CustomerPanel })),
);
const TransferPanel = lazy(() =>
  import('../transfers/TransferPanel').then((m) => ({ default: m.TransferPanel })),
);
const StoragePanel = lazy(() =>
  import('../storage/StoragePanel').then((m) => ({ default: m.StoragePanel })),
);
const PurchasingPanel = lazy(() =>
  import('../purchasing/PurchasingPanel').then((m) => ({ default: m.PurchasingPanel })),
);
const InventoryWorkspace = lazy(() =>
  import('../inventory/InventoryWorkspace').then((m) => ({ default: m.InventoryWorkspace })),
);
const PayablePanel = lazy(() =>
  import('../purchasing/PayablePanel').then((m) => ({ default: m.PayablePanel })),
);

const ReportsPanel = lazy(() =>
  import('../reports/ReportsPanel').then((m) => ({ default: m.ReportsPanel })),
);
const NotificationsPanel = lazy(() =>
  import('../notifications/NotificationsPanel').then((m) => ({ default: m.NotificationsPanel })),
);
const TradingPanel = lazy(() =>
  import('../trading/TradingPanel').then((m) => ({ default: m.TradingPanel })),
);
const AccountingPanel = lazy(() =>
  import('../accounting/AccountingPanel').then((m) => ({ default: m.AccountingPanel })),
);
const IntegrationsPanel = lazy(() =>
  import('../integrations/IntegrationsPanel').then((m) => ({ default: m.IntegrationsPanel })),
);
const StorefrontPanel = lazy(() =>
  import('../storefront/StorefrontPanel').then((m) => ({ default: m.StorefrontPanel })),
);
export const panels = [
  {
    name: 'categories',
    label: 'Categories',
    description: 'Product category management.',
    Component: CategoryPage,
    permissions: ['products.read', 'products.write'],
  },
  {
    name: 'storefront',
    label: 'Online store',
    description: 'Published catalog settings and readiness.',
    Component: StorefrontPanel,
    permissions: ['onlineStore.view'],
  },
  {
    name: 'trading',
    label: 'Business trading',
    description: 'Explicitly shared partner orders and status.',
    Component: TradingPanel,
    permissions: ['business.write'],
  },
  {
    name: 'accounting',
    label: 'Accounting',
    description: 'Balanced journals, source posting and trial balances.',
    Component: AccountingPanel,
    permissions: ['reports.read', 'payments.read', 'sales.read', 'purchases.read'],
  },
  {
    name: 'integrations',
    label: 'Integrations & help',
    description: 'Provider status and permission-aware navigation help.',
    Component: IntegrationsPanel,
    permissions: ['business.read'],
  },
  {
    name: 'reports',
    label: 'Reports & dashboard',
    description: 'Reconciled sales, purchasing, stock and balance reports.',
    Component: ReportsPanel,
    permissions: ['reports.read'],
  },
  {
    name: 'notifications',
    label: 'Notifications & approvals',
    description: 'Business events and pending approvals in your scope.',
    Component: NotificationsPanel,
    permissions: ['business.read'],
  },
  {
    name: 'customers',
    label: 'Customers',
    description: 'Customer records, credit limits and outstanding balances.',
    Component: CustomerPanel,
    permissions: ['customers.read'],
  },
  {
    name: 'catalog',
    label: 'Inventory',
    description: 'Products, categories, barcodes and selling prices.',
    Component: InventoryWorkspace,
    permissions: ['products.read'],
  },
  {
    name: 'warehouse',
    label: 'Warehouse operations',
    description: 'Stock counts, reconciliation and scanning.',
    Component: WarehousePanel,
    permissions: ['stock.read'],
  },
  {
    name: 'transfers',
    label: 'Transfers',
    description: 'Move stock between warehouses with a traceable receipt.',
    Component: TransferPanel,
    permissions: ['stock.read'],
  },
  {
    name: 'purchasing',
    label: 'Purchasing',
    description: 'Suppliers, purchase orders, receipts and supplier returns.',
    Component: PurchasingPanel,
    permissions: ['purchases.read'],
  },
  {
    name: 'payables',
    label: 'Supplier balances',
    description: 'Invoice credits, cash payments and supplier refunds.',
    Component: PayablePanel,
    permissions: ['purchases.read', 'payments.read'],
  },
  {
    name: 'storage',
    label: 'Warehouse & storage',
    description: 'Organize storage and locate stock within warehouses.',
    Component: StoragePanel,
    permissions: ['stock.read'],
  },
  {
    name: 'inventory',
    label: 'Inventory',
    description: 'Stock balances, adjustments and movement history.',
    Component: InventoryWorkspace,
    permissions: ['stock.read'],
  },
] satisfies {
  name: string;
  label: string;
  description: string;
  Component: typeof InventoryWorkspace;
  permissions: Permission[];
}[];
