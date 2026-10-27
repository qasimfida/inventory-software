import { upgradeLegacySettings } from './storefront-management-defaults.js';
import { storefrontSettingsSchema } from '@inventory/contracts';
import { onlineStoreSettingsSchema, channelListingSchema } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import type { StorefrontSettings, OnlineStoreSettings } from '@inventory/contracts';
import { readPolicy } from '../settings/settings-store.js';
export async function managementSettings(
  ctx: OrganizationContext,
  storeId: string,
  origins: readonly string[] = [],
) {
  const row = (
    await ctx.tx.query(
      'SELECT management,settings,version FROM storefront_settings WHERE business_id=$1 AND store_id=$2',
      [ctx.business.id, storeId],
    )
  ).rows[0];
  return row?.management
    ? onlineStoreSettingsSchema.parse({ ...row.management, version: row.version })
    : row
      ? upgradeLegacySettings(
          ctx,
          storefrontSettingsSchema.parse({ ...row.settings, version: row.version }),
          origins,
        )
      : null;
}
export function legacySettings(s: OnlineStoreSettings): StorefrontSettings {
  return {
    name: s.name,
    slug: s.slug,
    storeId: s.storeId,
    currency: s.currency,
    contact: [s.contact.email, s.contact.phone, s.contact.address]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 200),
    fulfillment: s.fulfillment.cashOnDelivery
      ? s.fulfillment.pickup.enabled
        ? 'both'
        : 'delivery'
      : 'pickup',
    returnPolicy: s.returnPolicy,
    shippingPolicy: s.shippingPolicy,
    hideSoldOut: s.soldOutBehavior === 'hide',
    enabled: s.enabled,
    version: s.version,
  };
}
export async function managementPrerequisites(ctx: OrganizationContext, s: OnlineStoreSettings) {
  const issues: string[] = [];
  const company = (await readPolicy(ctx.tx, ctx.business.id)).values.company;
  if (!company?.displayName || !company.address)
    issues.push('Complete the business name and address.');
  if (!s.contact.address || (!s.contact.email && !s.contact.phone))
    issues.push('Add an address and an email or phone number.');
  if (
    !s.fulfillment.pickup.enabled &&
    !s.fulfillment.cashOnDelivery &&
    !s.fulfillment.manualBankTransfer.enabled
  )
    issues.push('Enable at least one fulfillment method.');
  if (s.fulfillment.pickup.enabled && !s.fulfillment.pickup.locationId)
    issues.push('Choose a pickup location.');
  if (
    s.fulfillment.manualBankTransfer.enabled &&
    !s.fulfillment.manualBankTransfer.instructions.trim()
  )
    issues.push('Add manual bank transfer instructions.');
  if (s.returnPolicy.trim().length < 10)
    issues.push('Add a return policy of at least 10 characters.');
  if (s.fulfillment.cashOnDelivery && s.shippingPolicy.trim().length < 10)
    issues.push('Add a shipping policy of at least 10 characters.');
  if (!s.stockSources.length) issues.push('Choose at least one stock-source warehouse.');
  if (!s.allowedImageHosts.length) issues.push('Allow at least one image host.');
  return issues;
}
export const managementListingSelect = `SELECT l.*,COALESCE(l.projection->>'title',NULLIF(l.overrides->>'title',''),p.name,'') AS title FROM channel_listings l LEFT JOIN catalog_products p ON p.business_id=l.business_id AND p.id=l.product_id`;
export function managementListing(row: Record<string, unknown>, costVisible: boolean) {
  const issues = Array.isArray(row.structured_issues) ? row.structured_issues : [];
  const projection = row.projection as { availability?: string } | null;
  const iso = (v: unknown) =>
    v instanceof Date ? v.toISOString() : typeof v === 'string' ? v : null;
  return channelListingSchema.parse({
    id: row.id,
    businessId: row.business_id,
    storeId: row.store_id,
    productId: row.product_id,
    variantId: row.variant_id,
    status: row.state,
    issues: costVisible ? issues : issues.filter((i) => i.code !== 'PRICE_BELOW_COST'),
    ruleVersion: row.rule_version,
    overrides: row.online_overrides,
    publishedAt: iso(row.published_at),
    pausedAt: iso(row.paused_at),
    lastValidatedAt: iso(row.last_validated_at),
    version: row.version,
    title: row.title,
    availability: projection?.availability === 'in_stock' ? 'IN_STOCK' : 'SOLD_OUT',
  });
}
