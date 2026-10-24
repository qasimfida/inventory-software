import { displayPrices } from '../catalog/display-prices.js';
import type { StockOverview } from '@inventory/contracts';
import { defaultIndustry } from '@inventory/contracts';
import type { StockOverviewQuery } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { readPolicy } from '../settings/settings-store.js';
/** One snapshot for cards and paginated SKU rows; zero-balance SKUs remain visible. */
export async function stockOverview(ctx: OrganizationContext, q: StockOverviewQuery) {
  const threshold =
    (await readPolicy(ctx.tx, ctx.business.id)).values.industry?.lowStockThreshold ??
    defaultIndustry.lowStockThreshold;
  const result = await ctx.tx.query<{
    counts: unknown;
    total: number;
    items: StockOverview['items'];
  }>(
    `
    WITH quantities AS (
      SELECT variant_id, sum(on_hand-reserved-damaged) AS available
      FROM stock_balances WHERE business_id=$1 AND warehouse_id=ANY($2::uuid[]) GROUP BY variant_id
    ), stock AS (
      SELECT v.id,v.product_id AS "productId",v.name,v.sku,u.code AS unit,COALESCE(s.available,0) AS available,
        CASE WHEN COALESCE(s.available,0)<=0 THEN 'out-of-stock'
          WHEN s.available<=$3::numeric THEN 'low-stock' ELSE 'in-stock' END AS status
      FROM catalog_variants v
      JOIN catalog_products p ON p.business_id=v.business_id AND p.id=v.product_id
      JOIN catalog_units u ON u.business_id=v.business_id AND u.id=v.base_unit_id
      LEFT JOIN quantities s ON s.variant_id=v.id
      WHERE v.business_id=$1 AND v.state='active' AND p.state='active' AND p.track_inventory
    ), filtered AS (
      SELECT * FROM stock WHERE ($4='all' OR status=$4) AND (name ILIKE $5 OR sku ILIKE $5)
    ), page AS (
      SELECT id,"productId",name,sku,unit,available::text,status FROM filtered ORDER BY sku,id LIMIT $6 OFFSET $7
    ) SELECT (SELECT json_build_object('all',count(*),'in-stock',count(*) FILTER(WHERE status='in-stock'),
      'low-stock',count(*) FILTER(WHERE status='low-stock'),'out-of-stock',count(*) FILTER(WHERE status='out-of-stock')) FROM stock) AS counts,
      (SELECT count(*)::int FROM filtered) AS total,
      COALESCE((SELECT json_agg(page) FROM page),'[]'::json) AS items`,
    [
      ctx.business.id,
      q.warehouseIds ?? [q.warehouseId],
      threshold,
      q.status,
      `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
      q.limit,
      q.offset,
    ],
  );
  const row = result.rows[0]!;
  const storeRows = await ctx.tx.query<{ store_id: string }>(
    'SELECT DISTINCT store_id FROM warehouses WHERE business_id=$1 AND id=ANY($2::uuid[])',
    [ctx.business.id, q.warehouseIds ?? [q.warehouseId]],
  );
  // A multi-store view shows the business price, never an arbitrary store override.
  const storeId = storeRows.rows.length === 1 ? storeRows.rows[0]!.store_id : undefined;
  const prices = await displayPrices(
    ctx,
    row.items.map((item) => item.id),
    storeId,
  );
  return {
    ...row,
    items: row.items.map((item) => ({ ...item, price: prices.get(item.id) ?? null })),
    threshold,
    offset: q.offset,
    limit: q.limit,
  };
}
