import { validImageHost } from '@inventory/contracts';
import type { OnlineStoreSettings, StorefrontSettings } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { storefrontDefaults } from './storefront-records.js';
import { readPolicy } from '../settings/settings-store.js';
export async function managementDefaults(ctx: OrganizationContext, storeId: string) {
  const company = (await readPolicy(ctx.tx, ctx.business.id)).values.company;
  const inherited = await storefrontDefaults(ctx);
  const warehouses = (
    await ctx.tx.query<{ id: string }>(
      "SELECT id FROM warehouses WHERE business_id=$1 AND store_id=$2 AND state='active' ORDER BY id",
      [ctx.business.id, storeId],
    )
  ).rows.map((r) => r.id);
  return {
    ...inherited,
    businessId: ctx.business.id,
    storeId,
    contact: {
      email: company?.email ?? '',
      phone: company?.phone ?? '',
      address: company?.address ?? '',
    },
    stockSources: warehouses,
  };
}
/** Read-only conversion of pre-Phase-A settings; materialized only on an authorized save. */
export async function upgradeLegacySettings(
  ctx: OrganizationContext,
  legacy: StorefrontSettings,
  origins: readonly string[],
): Promise<OnlineStoreSettings> {
  const defaults = await managementDefaults(ctx, legacy.storeId);
  const { hideSoldOut, contact, fulfillment, ...base } = legacy;
  return {
    ...base,
    businessId: ctx.business.id,
    status: legacy.enabled ? 'live' : 'configured',
    contact: { ...defaults.contact, address: contact || defaults.contact.address },
    fulfillment: {
      pickup: {
        enabled: fulfillment !== 'delivery',
        locationId: legacy.storeId,
        instructions: '',
        hours: '',
      },
      cashOnDelivery: fulfillment !== 'pickup',
      manualBankTransfer: { enabled: false, instructions: '' },
    },
    stockSources: defaults.stockSources,
    safetyBuffer: '0',
    soldOutBehavior: hideSoldOut ? 'hide' : 'show',
    allowedImageHosts: origins.map((o) => new URL(o).hostname).filter(validImageHost),
  };
}
