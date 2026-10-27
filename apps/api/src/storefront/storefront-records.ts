import { storefrontSettingsSchema, listingInputSchema } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { readPolicy } from '../settings/settings-store.js';
export async function settings(ctx: OrganizationContext, storeId?: string) {
  const row = (
    await ctx.tx.query(
      'SELECT settings,version FROM storefront_settings WHERE business_id=$1 AND ($2::uuid IS NULL OR store_id=$2) ORDER BY store_id LIMIT 1',
      [ctx.business.id, storeId ?? ctx.business.scope?.storeId ?? null],
    )
  ).rows[0];
  return row ? storefrontSettingsSchema.parse({ ...row.settings, version: row.version }) : null;
}
export async function prerequisites(
  ctx: OrganizationContext,
  config: NonNullable<Awaited<ReturnType<typeof settings>>>,
) {
  const issues: string[] = [],
    company = (await readPolicy(ctx.tx, ctx.business.id)).values.company;
  if (!company?.displayName || !company.address)
    issues.push('Complete the business name and address in company settings');
  if (config.contact.trim().length < 3) issues.push('Add public contact details');
  if (config.returnPolicy.trim().length < 10)
    issues.push('Add a return policy of at least 10 characters');
  if (config.fulfillment !== 'pickup' && config.shippingPolicy.trim().length < 10)
    issues.push('Shipping policy required for delivery');
  const store = (
    await ctx.tx.query("SELECT 1 FROM stores WHERE business_id=$1 AND id=$2 AND state='active'", [
      ctx.business.id,
      config.storeId,
    ])
  ).rowCount;
  if (!store) issues.push('Choose an active default store');
  return issues;
}
export async function listings(ctx: OrganizationContext, storeId?: string) {
  return (
    await ctx.tx.query(
      'SELECT l.id,l.product_id AS "productId",p.name AS "productName",l.overrides,l.state,l.issues,l.rule_version AS "ruleVersion",l.projection,l.version FROM channel_listings l JOIN catalog_products p ON p.business_id=l.business_id AND p.id=l.product_id WHERE l.business_id=$1 AND ($2::uuid IS NULL OR l.store_id=$2) ORDER BY l.id',
      [ctx.business.id, storeId ?? ctx.business.scope?.storeId ?? null],
    )
  ).rows.map((row) => ({
    ...listingInputSchema.parse({
      ...row.overrides,
      productId: row.productId,
      version: row.version,
    }),
    id: row.id,
    productName: row.productName,
    state: row.state,
    issues: row.issues,
    ruleVersion: row.ruleVersion,
    projection: row.projection,
  }));
}

/** Suggested setup values only: never silently publish or overwrite saved overrides. */
export async function storefrontDefaults(ctx: OrganizationContext) {
  const company = (await readPolicy(ctx.tx, ctx.business.id)).values.company;
  const store = (
    await ctx.tx.query<{ id: string; name: string }>(
      "SELECT id,name FROM stores WHERE business_id=$1 AND state='active' ORDER BY name,id LIMIT 1",
      [ctx.business.id],
    )
  ).rows[0];
  const name = (company?.displayName || ctx.business.name || store?.name || 'Online store').slice(
    0,
    120,
  );
  const stem =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 45)
      .replace(/-$/, '') || 'store';
  const contact = [company?.email, company?.phone, company?.address]
    .filter(Boolean)
    .join(' · ')
    .slice(0, 200);
  return {
    name,
    slug: `${stem}-${ctx.business.id.slice(0, 8)}`,
    ...(store ? { storeId: store.id } : {}),
    currency: company?.transactionCurrency ?? 'USD',
    ...(contact.length >= 3 ? { contact } : {}),
  };
}
