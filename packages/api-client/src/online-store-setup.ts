import { onlineMessages } from './online-messages.js';
import { onlineStoreSettingsSchema, storefrontSlugSchema } from '@inventory/contracts';
import type { OnlineStoreSettings } from '@inventory/contracts';
export const onlineSettingsSections = ['general', 'fulfillment', 'policies', 'images'] as const;
export type OnlineSettingsSection = (typeof onlineSettingsSections)[number];
export const onlineSectionLabels = {
  general: 'General',
  fulfillment: 'Fulfillment & payments',
  policies: 'Policies',
  images: 'Image sources',
};
export function initialOnlineSettings(
  businessId: string,
  storeId: string,
  defaults: Record<string, unknown>,
): OnlineStoreSettings {
  return onlineStoreSettingsSchema.parse({
    businessId,
    storeId,
    enabled: false,
    status: 'not_configured',
    name: 'Online store',
    slug: `store-${storeId.slice(0, 8)}`,
    currency: 'USD',
    contact: { email: '', phone: '', address: '' },
    stockSources: [],
    ...defaults,
    fulfillment: {
      pickup: { enabled: true, locationId: storeId, instructions: '', hours: '' },
      cashOnDelivery: false,
      manualBankTransfer: { enabled: false, instructions: '' },
    },
    returnPolicy: '',
    shippingPolicy: '',
    safetyBuffer: '0',
    soldOutBehavior: 'show',
    allowedImageHosts: [],
    version: 0,
  });
}
export function setupChecklist(s: OnlineStoreSettings, serverIssues: string[]) {
  return [
    {
      label: 'Business profile',
      done: !serverIssues.some((i) => /business name and address/i.test(i)),
      path: '/settings/company',
    },
    {
      label: 'Store name and URL slug',
      done: s.name.trim().length >= 2 && storefrontSlugSchema.safeParse(s.slug).success,
      path: '/online-store/settings/general',
    },
    {
      label: 'Public contact details',
      done: !!s.contact.address.trim() && !!(s.contact.email || s.contact.phone.trim()),
      path: '/online-store/settings/general',
    },
    {
      label: 'Fulfillment and payment instructions',
      done:
        ((s.fulfillment.pickup.enabled && !!s.fulfillment.pickup.locationId) ||
          s.fulfillment.cashOnDelivery ||
          s.fulfillment.manualBankTransfer.enabled) &&
        (!s.fulfillment.manualBankTransfer.enabled ||
          !!s.fulfillment.manualBankTransfer.instructions.trim()),
      path: '/online-store/settings/fulfillment',
    },
    {
      label: 'Return and shipping policies',
      done:
        s.returnPolicy.trim().length >= 10 &&
        (!s.fulfillment.cashOnDelivery || s.shippingPolicy.trim().length >= 10),
      path: '/online-store/settings/policies',
    },
    {
      label: 'Approved image sources',
      done: s.allowedImageHosts.length > 0,
      path: '/online-store/settings/images',
    },
    {
      label: 'Stock-source warehouses',
      done: s.stockSources.length > 0,
      path: '/online-store/settings/general',
    },
  ];
}
export function onlineRoute(path: string) {
  if (/^\/online-store\/products\/[0-9a-f-]{36}$/.test(path)) return '/online-store/products/:id';
  return path;
}
export function fulfillmentCount(s: OnlineStoreSettings) {
  return (
    Number(s.fulfillment.pickup.enabled) +
    Number(s.fulfillment.cashOnDelivery) +
    Number(s.fulfillment.manualBankTransfer.enabled)
  );
}
export const enableStoreMessage = onlineMessages.enable;
export const disableStoreMessage = onlineMessages.disable;

const onlineListeners = new Set<() => void>();
export const onlineStoreChanges = {
  subscribe: (fn: () => void) => {
    onlineListeners.add(fn);
    return () => {
      onlineListeners.delete(fn);
    };
  },
  notify: () => onlineListeners.forEach((fn) => fn()),
};
