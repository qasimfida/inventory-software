import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { hasPermission, onlineProductPreviewSchema } from '@inventory/contracts';
import type { OnlinePickerQuery, ReadinessInput } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import type { PricingService } from '../catalog/pricing.service.js';
import { evaluateListing } from './storefront-evaluation.js';
import {
  legacySettings,
  managementSettings,
  managementListing,
  managementListingSelect,
} from './storefront-management-records.js';
const empty = { title: null, description: null, images: null, price: null, visible: true };
/** Explicit public-field allowlist: no costs, supplier data or internal notes leave this read boundary. */
function safeSource(source: ReadinessInput) {
  return {
    ...source,
    variants: source.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      unit: v.unit,
      complete: v.complete,
      priceMinor: v.priceMinor,
      currency: v.currency,
      ...(v.posPriceMinor !== undefined ? { posPriceMinor: v.posPriceMinor } : {}),
    })),
  };
}
export async function productPreview(
  ctx: OrganizationContext,
  s: string,
  row: Record<string, unknown>,
  pricing: PricingService,
  origins: readonly string[],
) {
  const config = await managementSettings(ctx, s, origins);
  if (!config) throw new BadRequestException('Configure this store first.');
  const effective = await evaluateListing(
    ctx,
    legacySettings(config),
    config,
    row,
    pricing,
    origins,
  );
  const inherited =
    JSON.stringify(row.online_overrides) === JSON.stringify(empty)
      ? effective
      : await evaluateListing(
          ctx,
          legacySettings(config),
          config,
          { ...row, overrides: {}, online_overrides: empty },
          pricing,
          origins,
        );
  return onlineProductPreviewSchema.parse({
    categoryName:
      (
        await ctx.tx.query(
          'SELECT c.name FROM catalog_products p LEFT JOIN catalog_categories c ON c.business_id=p.business_id AND c.id=p.category_id WHERE p.business_id=$1 AND p.id=$2',
          [ctx.business.id, row.product_id],
        )
      ).rows[0]?.name ?? 'Uncategorized',
    productId: row.product_id,
    listingId: row.state === 'candidate' ? null : row.id,
    title: effective.source.title,
    source: safeSource(effective.source),
    inherited: safeSource(inherited.source),
    quantity: effective.quantity,
    images: effective.productImages,
    soldOutBehavior: config.soldOutBehavior,
    issues: effective.result.issues.filter(
      (i) => i.code !== 'PRICE_BELOW_COST' || hasPermission(ctx.business, 'purchases.read'),
    ),
  });
}
export async function productDetail(
  ctx: OrganizationContext,
  s: string,
  id: string,
  pricing: PricingService,
  origins: readonly string[],
) {
  const row = (
    await ctx.tx.query(
      `${managementListingSelect} WHERE l.business_id=$1 AND l.store_id=$2 AND l.id=$3 AND l.state<>'delisted'`,
      [ctx.business.id, s, id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return {
    listing: managementListing(row, hasPermission(ctx.business, 'purchases.read')),
    preview: await productPreview(ctx, s, row, pricing, origins),
  };
}
export async function pickerPage(
  ctx: OrganizationContext,
  s: string,
  q: OnlinePickerQuery,
  pricing: PricingService,
  origins: readonly string[],
) {
  const where = `p.business_id=$1 AND ($2='' OR p.name ILIKE '%'||$2||'%' OR p.sku ILIKE '%'||$2||'%' OR EXISTS(SELECT 1 FROM catalog_identifiers c WHERE c.business_id=p.business_id AND c.product_id=p.id AND c.code ILIKE '%'||$2||'%')) AND ($3::uuid IS NULL OR p.category_id=$3)`;
  const params = [ctx.business.id, q.search, q.category ?? null];
  const filtered = q.inStock === 'true' || q.readiness !== 'all';
  const rows = (
    await ctx.tx.query(
      `SELECT p.id FROM catalog_products p WHERE ${where} ORDER BY p.name,p.id LIMIT $4 OFFSET $5`,
      [...params, filtered ? 201 : q.limit, filtered ? 0 : q.offset],
    )
  ).rows;
  const total = Number(
    (await ctx.tx.query(`SELECT count(*) AS count FROM catalog_products p WHERE ${where}`, params))
      .rows[0]!.count,
  );
  if (filtered && total > 200)
    throw new BadRequestException(
      'Narrow search or category to at most 200 products before filtering readiness or stock.',
    );
  const items = [];
  for (const product of rows) {
    const existing = (
      await ctx.tx.query(
        "SELECT * FROM channel_listings WHERE business_id=$1 AND store_id=$2 AND product_id=$3 AND variant_id IS NULL AND state<>'delisted'",
        [ctx.business.id, s, product.id],
      )
    ).rows[0];
    items.push(
      await productPreview(
        ctx,
        s,
        existing ?? {
          id: randomUUID(),
          product_id: product.id,
          variant_id: null,
          version: 1,
          overrides: {},
          online_overrides: empty,
          state: 'candidate',
        },
        pricing,
        origins,
      ),
    );
  }
  const categories = (
    await ctx.tx.query(
      "SELECT id,name FROM catalog_categories WHERE business_id=$1 AND state='active' ORDER BY name",
      [ctx.business.id],
    )
  ).rows;
  if (filtered) {
    const matches = items.filter(
      (p) =>
        (q.inStock !== 'true' || Number(p.quantity) > 0) &&
        (q.readiness === 'all' ||
          (q.readiness === 'inactive'
            ? p.source.state !== 'active'
            : p.source.state === 'active' &&
              (q.readiness === 'issues'
                ? p.issues.some((i) => i.severity === 'error')
                : !p.issues.some((i) => i.severity === 'error')))),
    );
    return {
      items: matches.slice(q.offset, q.offset + q.limit),
      total: matches.length,
      categories,
      hasMore: q.offset + q.limit < matches.length,
    };
  }
  return { items, total, categories, hasMore: q.offset + items.length < total };
}
