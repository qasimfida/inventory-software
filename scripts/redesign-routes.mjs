// Reviewed entry points; route membership and permissions come from the live registry.
const W = 'apps/web/src/',
  N = 'apps/mobile/src/';
const feature = (path) => [W + 'features/' + path, N + path];
const shell = (web, native = web) => [W + 'shell/' + web, N + 'shell/' + native];
export const routeSources = {
  '/dashboard': feature('reports/Dashboard.tsx'),
  '/pos': feature('pos/PosPanel.tsx'),
  '/sales': feature('pos/ReceiptPanel.tsx'),
  '/cash': feature('pos/CashPanel.tsx'),
  '/inventory': feature('inventory/InventoryWorkspace.tsx'),
  '/catalog': feature('inventory/InventoryWorkspace.tsx'),
  '/catalog/:id': feature('catalog/ProductPage.tsx'),
  '/categories': feature('catalog/CategoryPage.tsx'),
  '/warehouse': feature('warehouse/WarehousePanel.tsx'),
  '/transfers': feature('transfers/TransferPanel.tsx'),
  '/storage': feature('storage/StoragePanel.tsx'),
  '/warehouse-view': feature('storage/StoragePanel.tsx'),
  '/purchasing': feature('purchasing/PurchasingPanel.tsx'),
  '/payables': feature('purchasing/PayablePanel.tsx'),
  '/customers': feature('customers/CustomerPanel.tsx'),
  '/accounting': feature('accounting/AccountingPanel.tsx'),
  '/reports': feature('reports/ReportsPanel.tsx'),
  '/trading': feature('trading/TradingPanel.tsx'),
  '/integrations': feature('integrations/IntegrationsPanel.tsx'),
  '/staff': feature('operations/OperationsPanel.tsx'),
  '/salaries': feature('operations/OperationsPanel.tsx'),
  '/team': [
    ...feature('organization/MemberEditor.tsx'),
    ...feature('operations/StaffDirectory.tsx'),
  ],
  '/logs': feature('settings/LogsPage.tsx'),
  '/notifications': feature('notifications/NotificationsPanel.tsx'),
  '/storefront': feature('storefront/StorefrontPanel.tsx'),
  '/online-store': feature('storefront/OnlineStorePage.tsx'),
  '/online-store/products': feature('storefront/OnlineProducts.tsx'),
  '/online-store/products/add': feature('storefront/OnlineProductPicker.tsx'),
  '/online-store/products/:id': feature('storefront/OnlineProductDetails.tsx'),
  '/online-store/settings': feature('storefront/OnlineStoreEditor.tsx'),
  '/settings/profile': shell('SettingsPage.tsx', 'SettingsScreen.tsx'),
  '/settings/company': feature('settings/CompanyProfile.tsx'),
  '/settings/business': shell('BusinessSettings.tsx'),
  '/settings/preferences': feature('settings/SettingsPanel.tsx'),
  '/settings/security': shell('SettingsPage.tsx', 'SettingsScreen.tsx'),
  '/settings/device': feature('offline/OfflinePanel.tsx'),
  '/settings/notifications': feature('settings/SecurityPanel.tsx'),
  '/settings/locations': feature('organization/LocationEditor.tsx'),
  '/settings/audit': feature('organization/AuditHistory.tsx'),
  '/settings/staff': feature('operations/OperationsPanel.tsx'),
  '/settings/users': feature('organization/MemberEditor.tsx'),
  '/admin': feature('reports/PlatformOverview.tsx'),
  '/admin/businesses': [
    W + 'features/platform/RegisteredBusinesses.tsx',
    N + 'platform-businesses/RegisteredBusinesses.tsx',
  ],
  '/auth/login': feature('auth/AuthPanel.tsx'),
  '/auth/invitation': feature('auth/AuthPanel.tsx'),
  '/auth/forgot': [W + 'features/auth/RecoveryPage.tsx', N + 'auth/RecoveryScreen.tsx'],
  '/auth/reset': [W + 'features/auth/RecoveryPage.tsx', N + 'auth/RecoveryScreen.tsx'],
  '/auth/link': [W + 'features/auth/RecoveryPage.tsx'],
  '/offline': feature('offline/OfflinePanel.tsx'),
  '/design-system': [W + 'features/foundation/FoundationPage.tsx'],
  '/more': [N + 'shell/MoreScreen.tsx'],
  '/': shell('Application.tsx', 'Navigation.tsx'),
  '/settings': shell('Application.tsx', 'Navigation.tsx'),
};
for (const section of ['general', 'fulfillment', 'policies', 'images'])
  routeSources[`/online-store/settings/${section}`] = feature('storefront/OnlineStoreEditor.tsx');
export const extraEvidence = {
  '/catalog/:id': ['packages/api-client/src/product-detail.ts', 'productDetailId'],
  '/admin': [W + 'shell/WorkspaceScreens.tsx', "'/admin'"],
  '/admin/businesses': [W + 'shell/WorkspaceScreens.tsx', "'/admin/businesses'"],
  '/auth/login': [W + 'shell/Application.tsx', "'/auth/login'"],
  '/auth/invitation': [W + 'shell/Application.tsx', "'/auth/invitation'"],
  '/auth/forgot': [W + 'shell/Application.tsx', "'/auth/forgot'"],
  '/auth/reset': [W + 'shell/Application.tsx', "'/auth/reset'"],
  '/auth/link': [W + 'shell/Application.tsx', "'/auth/link'"],
  '/offline': [W + 'shell/Application.tsx', "'/offline'"],
  '/design-system': [W + 'app/router.tsx', "'/design-system'"],
  '/more': [N + 'shell/NativeShell.tsx', "'/more'"],
  '/settings/staff': [W + 'shell/WorkspaceScreens.tsx', "'/settings/staff'"],
  '/settings/users': [W + 'shell/WorkspaceScreens.tsx', "'/settings/users'"],
  '/': [W + 'shell/Application.tsx', "'/'"],
  '/settings': [W + 'shell/Application.tsx', "'/settings'"],
};
export function risks(path) {
  if (path === '/pos' || path === '/offline')
    return 'Preserve quotes, idempotency, cart locks, bounded offline authority; sticky cart and keyboard/scanner focus.';
  if (/online-store|storefront/.test(path))
    return 'Separate readiness from availability; preserve partial command results, unsaved drafts and publication permissions.';
  if (/inventory|catalog|warehouse|storage|transfers|purchasing/.test(path))
    return 'Preserve units, pricing, ledger transitions, scope, search cancellation, selection and compatibility routes.';
  if (/settings|team|staff|admin|auth|logs|notifications/.test(path))
    return 'Preserve role/policy enforcement, loaded event details, session isolation, forms and confirmation behavior.';
  return 'Preserve currency, dates, permissions, bounded pagination, server totals and existing transaction actions.';
}
