import type { OnlineStoreSettings } from '@inventory/contracts';
import type { OnlineSettingsSection } from './online-store-setup.js';
export type SetupField = {
  key: string;
  label: string;
  value: string;
  max: number;
  multiline?: boolean;
  hint?: string;
};
export function setupFields(s: OnlineStoreSettings, section: OnlineSettingsSection): SetupField[] {
  if (section === 'general')
    return [
      { key: 'name', label: 'Store name', value: s.name, max: 120 },
      {
        key: 'slug',
        label: 'URL slug',
        value: s.slug,
        max: 60,
        hint: 'Lowercase letters, numbers and hyphens. Reserved names are unavailable.',
      },
      { key: 'email', label: 'Contact email', value: s.contact.email, max: 254 },
      { key: 'phone', label: 'Contact phone', value: s.contact.phone, max: 80 },
      {
        key: 'address',
        label: 'Public address',
        value: s.contact.address,
        max: 1000,
        multiline: true,
      },
      {
        key: 'buffer',
        label: 'Safety buffer per SKU',
        value: s.safetyBuffer,
        max: 19,
        hint: 'Base units held back from online availability across the selected warehouses.',
      },
    ];
  if (section === 'fulfillment')
    return [
      ...(s.fulfillment.pickup.enabled
        ? [
            {
              key: 'pickupInstructions',
              label: 'Pickup instructions',
              value: s.fulfillment.pickup.instructions,
              max: 2000,
              multiline: true,
            },
            { key: 'hours', label: 'Pickup hours', value: s.fulfillment.pickup.hours, max: 500 },
          ]
        : []),
      ...(s.fulfillment.manualBankTransfer.enabled
        ? [
            {
              key: 'bankInstructions',
              label: 'Manual bank transfer instructions',
              value: s.fulfillment.manualBankTransfer.instructions,
              max: 2000,
              multiline: true,
              hint: 'Public instructions only. Never enter banking passwords or private credentials.',
            },
          ]
        : []),
    ];
  if (section === 'policies')
    return [
      {
        key: 'returnPolicy',
        label: 'Return policy',
        value: s.returnPolicy,
        max: 4000,
        multiline: true,
        hint: 'At least 10 characters before enabling.',
      },
      {
        key: 'shippingPolicy',
        label: 'Shipping policy',
        value: s.shippingPolicy,
        max: 4000,
        multiline: true,
        hint: 'At least 10 characters when cash on delivery is enabled.',
      },
    ];
  return [];
}
export function updateSetupField(
  s: OnlineStoreSettings,
  key: string,
  value: string,
): OnlineStoreSettings {
  if (key === 'name' || key === 'slug' || key === 'returnPolicy' || key === 'shippingPolicy')
    return { ...s, [key]: value };
  if (key === 'email' || key === 'phone' || key === 'address')
    return { ...s, contact: { ...s.contact, [key]: value } };
  if (key === 'buffer') return { ...s, safetyBuffer: value };
  if (key === 'bankInstructions')
    return {
      ...s,
      fulfillment: {
        ...s.fulfillment,
        manualBankTransfer: { ...s.fulfillment.manualBankTransfer, instructions: value },
      },
    };
  if (key === 'pickupInstructions' || key === 'hours')
    return {
      ...s,
      fulfillment: {
        ...s.fulfillment,
        pickup: { ...s.fulfillment.pickup, [key === 'hours' ? 'hours' : 'instructions']: value },
      },
    };
  return s;
}
export function toggleFulfillment(
  s: OnlineStoreSettings,
  kind: 'pickup' | 'cashOnDelivery' | 'manualBankTransfer',
  enabled: boolean,
): OnlineStoreSettings {
  return {
    ...s,
    fulfillment: {
      ...s.fulfillment,
      [kind]: kind === 'cashOnDelivery' ? enabled : { ...s.fulfillment[kind], enabled },
    },
  };
}
