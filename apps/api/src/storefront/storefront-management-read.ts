import { readPolicy } from '../settings/settings-store.js';
import { storefrontSlugSchema, imageUrlHost, hasPermission } from '@inventory/contracts';
import type { ListingQuery } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { managementSettings, managementPrerequisites } from './storefront-management-records.js';
import { managementDefaults } from './storefront-management-defaults.js';
import { listingPage, listingCounts } from './storefront-management-queries.js';
export async function readManagement(
  ctx: OrganizationContext,
  s: string,
  kind: 'settings' | 'overview' | 'listings' | 'slug' | 'host' | 'history',
  q: ListingQuery,
  value: string,
  origins: readonly string[],
) {
  const b = ctx.business.id;
  const config = await managementSettings(ctx, s, origins);
  if (kind === 'slug') {
    const slug = storefrontSlugSchema.parse(value);
    const found = (
      await ctx.tx.query(
        'SELECT 1 FROM storefront_settings WHERE slug=$1 AND NOT(business_id=$2 AND store_id=$3)',
        [slug, b, s],
      )
    ).rowCount;
    return {
      available: !found,
      suggestions: found ? [`${slug.slice(0, 50)}-${s.slice(0, 8)}`] : [],
    };
  }
  if (kind === 'settings') {
    const company = (await readPolicy(ctx.tx, b)).values.company;
    return {
      settings: config,
      defaults: await managementDefaults(ctx, s),
      prerequisites: config
        ? await managementPrerequisites(ctx, config)
        : [
            'Configure this online store.',
            ...(!company?.displayName || !company.address
              ? ['Complete the business name and address.']
              : []),
          ],
    };
  }
  if (kind === 'host') {
    const rows = (
      await ctx.tx.query(
        "SELECT l.id,l.projection,l.overrides,l.online_overrides,p.images FROM channel_listings l LEFT JOIN catalog_products p ON p.business_id=l.business_id AND p.id=l.product_id WHERE l.business_id=$1 AND l.store_id=$2 AND l.state<>'delisted'",
        [b, s],
      )
    ).rows;
    const ids = rows
      .filter((r) => {
        const images: string[] =
          r.online_overrides.images ??
          (r.overrides.images?.length ? r.overrides.images : (r.images ?? []));
        return images.some((url) => imageUrlHost(url) === value);
      })
      .map((r) => String(r.id));
    return { host: value, count: ids.length, listingIds: ids };
  }
  if (kind === 'history')
    return (
      await ctx.tx.query(
        'SELECT id::text,listing_id AS "listingId",actor_id AS "actorId",transition,reason_code AS "reasonCode",before_data AS before,after_data AS after,created_at AS timestamp FROM listing_events WHERE business_id=$1 AND store_id=$2 AND listing_id=$3 ORDER BY id DESC LIMIT 200',
        [b, s, value],
      )
    ).rows.map((r) => ({ ...r, timestamp: r.timestamp.toISOString() }));
  if (kind === 'listings') return listingPage(ctx, s, q);
  const data = (
    await ctx.tx.query(
      "SELECT count(*) FILTER(WHERE state='active' AND projection->>'availability'='sold_out')::int AS sold_out,count(*) FILTER(WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(structured_issues) issue WHERE issue->>'severity'='warning' AND ($3::boolean OR issue->>'code'<>'PRICE_BELOW_COST')))::int AS warnings,max(last_validated_at) AS last FROM channel_listings WHERE business_id=$1 AND store_id=$2 AND state<>'delisted'",
      [b, s, hasPermission(ctx.business, 'purchases.read')],
    )
  ).rows[0]!;
  return {
    status: config?.status ?? 'not_configured',
    counts: await listingCounts(ctx, s),
    soldOut: data.sold_out,
    warnings: data.warnings,
    lastValidatedAt: data.last?.toISOString() ?? null,
    asOf: new Date().toISOString(),
  };
}
