import { lazy } from 'react';
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
const InventoryPanel = lazy(() =>
  import('../inventory/InventoryPanel').then((m) => ({ default: m.InventoryPanel })),
);
const CatalogPanel = lazy(() =>
  import('../catalog/CatalogPanel').then((m) => ({ default: m.CatalogPanel })),
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
const WarehouseViewPanel = lazy(() =>
  import('../visualization/WarehouseViewPanel').then((m) => ({ default: m.WarehouseViewPanel })),
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
export const panels = [
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
    name: 'warehouse-view',
    label: 'Warehouse hierarchy',
    description: 'Explore real storage locations and their stock.',
    Component: WarehouseViewPanel,
    permissions: ['stock.read'],
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
    label: 'Catalog & pricing',
    description: 'Products, categories, barcodes and selling prices.',
    Component: CatalogPanel,
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
    label: 'Storage locations',
    description: 'Organize storage and locate stock within warehouses.',
    Component: StoragePanel,
    permissions: ['stock.read'],
  },
  {
    name: 'inventory',
    label: 'Inventory',
    description: 'Stock balances, adjustments and movement history.',
    Component: InventoryPanel,
    permissions: ['stock.read'],
  },
] satisfies {
  name: string;
  label: string;
  description: string;
  Component: typeof CatalogPanel;
  permissions: Permission[];
}[];
