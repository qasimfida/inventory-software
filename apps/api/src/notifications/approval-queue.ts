import { hasPermission } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
export async function approvalQueue(ctx: OrganizationContext, offset: number) {
  const allowed = (permission: 'purchases.write' | 'stock.write' | 'business.write') =>
    hasPermission(ctx.business, permission);
  const result = await ctx.tx.query(
    `WITH wh AS (SELECT id FROM warehouses WHERE business_id=$1
    AND ($2::uuid IS NULL OR store_id=$2) AND ($3::uuid IS NULL OR id=$3))
    SELECT * FROM (
    SELECT p.id,'purchase' AS kind,p.reference,p.state,p.version,p.warehouse_id AS "warehouseId"
      FROM purchase_orders p WHERE p.business_id=$1 AND p.state='draft' AND p.warehouse_id IN(SELECT id FROM wh) AND $4
    UNION ALL SELECT t.id,'transfer',t.reference,t.state,t.version,t.source_warehouse_id
      FROM stock_transfers t WHERE t.business_id=$1 AND t.state='draft' AND t.source_warehouse_id IN(SELECT id FROM wh)
      AND t.destination_warehouse_id IN(SELECT id FROM wh) AND $5
    UNION ALL SELECT c.id,'count','Stock count',c.state,c.version,c.warehouse_id FROM stock_counts c
      WHERE c.business_id=$1 AND c.state='review' AND c.warehouse_id IN(SELECT id FROM wh) AND $6
    ) pending ORDER BY kind,id LIMIT 51 OFFSET $7`,
    [
      ctx.business.id,
      ctx.business.scope?.storeId ?? null,
      ctx.business.scope?.warehouseId ?? null,
      allowed('purchases.write') && hasPermission(ctx.business, 'purchases.read'),
      allowed('stock.write') && hasPermission(ctx.business, 'stock.read'),
      allowed('business.write') && hasPermission(ctx.business, 'stock.read'),
      offset,
    ],
  );
  return { items: result.rows.slice(0, 50), hasMore: result.rows.length > 50, offset };
}
