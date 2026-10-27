import { StorefrontPanel } from '../storefront/StorefrontPanel';
import { Dashboard } from '../reports/Dashboard';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { TradingPanel } from '../trading/TradingPanel';
import { AccountingPanel } from '../accounting/AccountingPanel';
import { IntegrationsPanel } from '../integrations/IntegrationsPanel';
import { ReportsPanel } from '../reports/ReportsPanel';
import { NotificationsPanel } from '../notifications/NotificationsPanel';
import { WarehouseViewPanel } from '../visualization/WarehouseViewPanel';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location, Permission } from '@inventory/contracts';
import { WarehousePanel } from '../warehouse/WarehousePanel';
import { CustomerPanel } from '../customers/CustomerPanel';
import { TransferPanel } from '../transfers/TransferPanel';
import { StoragePanel } from '../storage/StoragePanel';
import { PurchasingPanel } from '../purchasing/PurchasingPanel';
import { InventoryPanel } from '../inventory/InventoryPanel';
import { CatalogPanel } from '../catalog/CatalogPanel';
import { PayablePanel } from '../purchasing/PayablePanel';
export const panels = [
  { name: 'storefront', Component: StorefrontPanel, permissions: ['onlineStore.view'] },
  { name: 'trading', Component: TradingPanel, permissions: ['business.write'] },
  {
    name: 'accounting',
    Component: AccountingPanel,
    permissions: ['reports.read', 'payments.read', 'sales.read', 'purchases.read'],
  },
  { name: 'integrations', Component: IntegrationsPanel, permissions: ['business.read'] },
  { name: 'reports', Component: ReportsPanel, permissions: ['reports.read'] },
  { name: 'notifications', Component: NotificationsPanel, permissions: ['business.read'] },
  { name: 'warehouse-view', Component: WarehouseViewPanel, permissions: ['stock.read'] },
  { name: 'customers', Component: CustomerPanel, permissions: ['customers.read'] },
  { name: 'catalog', Component: CatalogPanel, permissions: ['products.read'] },
  { name: 'warehouse', Component: WarehousePanel, permissions: ['stock.read'] },
  { name: 'transfers', Component: TransferPanel, permissions: ['stock.read'] },
  { name: 'purchasing', Component: PurchasingPanel, permissions: ['purchases.read'] },
  { name: 'payables', Component: PayablePanel, permissions: ['purchases.read', 'payments.read'] },
  { name: 'storage', Component: StoragePanel, permissions: ['stock.read'] },
  { name: 'inventory', Component: InventoryPanel, permissions: ['stock.read'] },
] satisfies { name: string; Component: typeof CatalogPanel; permissions: Permission[] }[];
export function ManagementWorkflows({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const theme = useTheme();
  const [page, setPage] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [visited, setVisited] = useState<string[]>([]);
  const available =
    business.state === 'active'
      ? panels.filter((p) =>
          p.permissions.every((permission) => hasPermission(business, permission)),
        )
      : [];
  const labels: Record<string, string> = {
    storefront: 'Online store',
    catalog: 'Catalog & pricing',
    inventory: 'Inventory',
    warehouse: 'Warehouse operations',
    transfers: 'Transfers',
    purchasing: 'Purchasing',
    customers: 'Customers',
    reports: 'Reports & dashboard',
    notifications: 'Notifications & approvals',
    'warehouse-view': 'Warehouse hierarchy',
    storage: 'Storage locations',
    payables: 'Supplier balances',
    accounting: 'Accounting',
    trading: 'Business trading',
    integrations: 'Integrations & help',
  };
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <DisclosureTrigger
        expanded={menuOpen}
        label={page ? `Workspace sections · ${labels[page] ?? page}` : 'Workspace sections'}
        onPress={() => setMenuOpen(!menuOpen)}
      />
      {page && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setPage(null)}
          style={{ minHeight: 48, justifyContent: 'center' }}
        >
          <Text tone="info">Back to dashboard</Text>
        </Pressable>
      )}
      <View
        style={{
          display: menuOpen ? 'flex' : 'none',
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.small,
        }}
        accessibilityElementsHidden={!menuOpen}
        importantForAccessibility={menuOpen ? 'auto' : 'no-hide-descendants'}
      >
        {available.map(({ name }) => (
          <Pressable
            key={name}
            accessibilityRole="button"
            accessibilityState={{ selected: page === name }}
            onPress={() => {
              setPage(name);
              setMenuOpen(false);
              setVisited((previous) => (previous.includes(name) ? previous : [...previous, name]));
            }}
            style={({ pressed }) => ({
              minHeight: 48,
              flexGrow: 1,
              flexBasis: '45%',
              padding: theme.spacing.medium,
              borderRadius: theme.radius,
              backgroundColor: page === name ? theme.tokens.selected : theme.colors.card,
              borderWidth: 1,
              borderColor: pressed ? theme.colors.primary : theme.colors.border,
            })}
          >
            <Text
              style={{
                color:
                  page === name ? theme.tokens['selected-foreground'] : theme.colors.foreground,
                fontWeight: page === name ? '600' : '400',
              }}
            >
              {labels[name]}
            </Text>
          </Pressable>
        ))}
      </View>
      {!page && business.state === 'active' && hasPermission(business, 'reports.read') && (
        <Dashboard business={business} />
      )}
      {!available.some((item) => item.name === page) && (
        <Text tone="muted">Choose a section to start working.</Text>
      )}
      {available
        .filter((p) => visited.includes(p.name))
        .map(({ Component, name }) => (
          <View
            key={name}
            style={{ display: page === name ? 'flex' : 'none' }}
            accessibilityElementsHidden={page !== name}
            importantForAccessibility={page === name ? 'auto' : 'no-hide-descendants'}
          >
            <Component
              key={JSON.stringify(
                name === 'warehouse' ? [name, business] : [name, business, locations],
              )}
              business={business}
              locations={locations}
            />
          </View>
        ))}
    </View>
  );
}
