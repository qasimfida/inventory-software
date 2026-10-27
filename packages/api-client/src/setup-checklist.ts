import { setupChecklistSchema } from '@inventory/contracts';
import type { CancellationSignal } from './cancellation.js';
import type { OrganizationTransport } from './organization.js';
export const setupSteps = [
  {
    key: 'profile',
    icon: 'building',
    label: 'Business profile',
    path: '/settings/company',
    permission: 'business.write',
  },
  {
    key: 'currency',
    icon: 'currency',
    label: 'Transaction currency',
    path: '/settings/company',
    permission: 'business.write',
  },
  {
    key: 'tax',
    icon: 'receipt',
    label: 'Tax defaults',
    path: '/settings/company',
    permission: 'business.write',
  },
  {
    key: 'locations',
    icon: 'warehouse',
    label: 'Stores and warehouses',
    path: '/settings/locations',
    permission: 'locations.write',
  },
  {
    key: 'product',
    icon: 'package',
    label: 'First product',
    path: '/catalog',
    permission: 'products.write',
  },
  {
    key: 'stock',
    icon: 'boxes',
    label: 'First stock',
    path: '/inventory',
    permission: 'stock.write',
  },
] as const;
export function createSetupClient(request: OrganizationTransport, businessId: string) {
  return (signal?: CancellationSignal) =>
    request(`/${encodeURIComponent(businessId)}/setup`, 'GET', undefined, signal).then((data) =>
      setupChecklistSchema.parse(data),
    );
}

export function dismissSetup(request: OrganizationTransport, businessId: string) {
  return request(`/${encodeURIComponent(businessId)}/setup/dismiss`, 'POST').then((data) =>
    setupChecklistSchema.parse(data),
  );
}
