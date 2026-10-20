import { NotFoundException } from '@nestjs/common';
import type { OrganizationContext } from '../organization/organization.scope.js';
export const countProjection = `id,warehouse_id AS "warehouseId",location_id AS "locationId",blind,state,version,created_by AS "createdBy",approved_by AS "approvedBy",created_at::text AS "createdAt",approved_at::text AS "approvedAt"`;
export async function count(ctx: OrganizationContext, id: string) {
  const c = (
    await ctx.tx.query<{
      id: string;
      warehouseId: string;
      locationId: string;
      blind: boolean;
      state: string;
      version: number;
    }>(`SELECT ${countProjection} FROM stock_counts WHERE business_id=$1 AND id=$2`, [
      ctx.business.id,
      id,
    ])
  ).rows[0];
  if (!c) throw new NotFoundException();
  return c;
}
export async function countDetail(ctx: OrganizationContext, id: string) {
  const c = await count(ctx, id);
  const lines = (
    await ctx.tx.query(
      `SELECT l.id,l.variant_id AS "variantId",p.name,v.sku,CASE WHEN $3 THEN NULL ELSE l.expected::text END AS expected,l.counted::text,l.unit_id AS "unitId",l.quantity::text,l.counted_by AS "countedBy",l.counted_at::text AS "countedAt",l.attempt,(COALESCE(b.version,0)<>l.balance_version) AS stale FROM stock_count_lines l JOIN catalog_variants v ON v.business_id=l.business_id AND v.id=l.variant_id JOIN catalog_products p ON p.business_id=v.business_id AND p.id=v.product_id LEFT JOIN stock_balances b ON b.business_id=l.business_id AND b.variant_id=l.variant_id AND b.warehouse_id=$4 AND b.location_id=$5 WHERE l.business_id=$1 AND l.count_id=$2 ORDER BY v.sku,l.id`,
      [ctx.business.id, id, c.blind && c.state === 'draft', c.warehouseId, c.locationId],
    )
  ).rows;
  return { count: c, lines };
}
export async function balance(
  ctx: OrganizationContext,
  c: { warehouseId: string; locationId: string },
  variantId: string,
) {
  return (
    (
      await ctx.tx.query<{ on_hand: string; version: number }>(
        'SELECT on_hand::text,version FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2 AND location_id=$3 AND variant_id=$4',
        [ctx.business.id, c.warehouseId, c.locationId, variantId],
      )
    ).rows[0] ?? { on_hand: '0', version: 0 }
  );
}
