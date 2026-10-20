import { hasPermission } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { variantProjection } from './variant.repository.js';
export const priceProjection = `id,variant_id AS "variantId",store_id AS "storeId",unit_price::text AS "unitPrice",currency,tax_basis_points AS "taxBasisPoints",tax_inclusive AS "taxInclusive",starts_at AS "startsAt",ends_at AS "endsAt"`;
export const promotionProjection = `id,name,variant_id AS "variantId",store_id AS "storeId",discount_basis_points AS "discountBasisPoints",minimum_quantity::text AS "minimumQuantity",priority,starts_at AS "startsAt",ends_at AS "endsAt"`;
export function periodWire<T extends { startsAt: Date; endsAt: Date | null }>(row: T) {
  return {
    ...row,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
  };
}
export async function pricingWorkspace(ctx: OrganizationContext, productId: string) {
  const businessId = ctx.business.id;
  const units = (
    await ctx.tx.query(
      'SELECT id,name,code,dimension FROM catalog_units WHERE business_id=$1 ORDER BY name,id',
      [businessId],
    )
  ).rows;
  const variants = (
    await ctx.tx.query<{ cost: string | null }>(
      `SELECT ${variantProjection} FROM catalog_variants v WHERE v.business_id=$1 AND v.product_id=$2 ORDER BY v.sku,v.id`,
      [businessId, productId],
    )
  ).rows.map((row) => ({
    ...row,
    cost: hasPermission(ctx.business, 'purchases.read') ? row.cost : null,
  }));
  const args = [businessId, productId, ctx.business.scope?.storeId ?? null];
  const filter = `business_id=$1 AND variant_id IN (SELECT id FROM catalog_variants WHERE business_id=$1 AND product_id=$2) AND ($3::uuid IS NULL OR store_id IS NULL OR store_id=$3)`;
  const prices = (
    await ctx.tx.query<{ startsAt: Date; endsAt: Date | null }>(
      `SELECT ${priceProjection} FROM price_entries WHERE customer_id IS NULL AND ${filter} ORDER BY starts_at DESC,id`,
      args,
    )
  ).rows.map(periodWire);
  const promotions = (
    await ctx.tx.query<{ startsAt: Date; endsAt: Date | null }>(
      `SELECT ${promotionProjection},EXISTS(SELECT 1 FROM promotion_withdrawals w WHERE w.business_id=price_promotions.business_id AND w.promotion_id=price_promotions.id) AS withdrawn FROM price_promotions WHERE ${filter} ORDER BY priority DESC,id`,
      args,
    )
  ).rows.map(periodWire);
  const conversions = (
    await ctx.tx.query(
      'SELECT variant_id AS "variantId",unit_id AS "unitId",numerator::text,denominator::text FROM catalog_conversions WHERE business_id=$1 AND variant_id IN (SELECT id FROM catalog_variants WHERE business_id=$1 AND product_id=$2)',
      [businessId, productId],
    )
  ).rows;
  return { units, variants, prices, promotions, conversions };
}
