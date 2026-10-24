import type { Product } from '@inventory/contracts';
type DisplayPrice = NonNullable<Product['price']>;
import { hasPermission } from '@inventory/contracts';
import { ForbiddenException } from '@nestjs/common';
import type { OrganizationContext } from '../organization/organization.scope.js';
/** Regular base-unit prices only. Customer-specific prices and checkout discounts stay in quote. */
export async function displayPrices(ctx: OrganizationContext, ids: string[], storeId?: string) {
  if (!hasPermission(ctx.business, 'products.read')) return new Map<string, DisplayPrice>();
  const scopeStore = ctx.business.scope?.storeId;
  if (storeId && scopeStore && storeId !== scopeStore) throw new ForbiddenException();
  const store = storeId ?? scopeStore ?? null;
  if (
    store &&
    !(
      await ctx.tx.query("SELECT 1 FROM stores WHERE business_id=$1 AND id=$2 AND state='active'", [
        ctx.business.id,
        store,
      ])
    ).rowCount
  )
    throw new ForbiddenException();
  if (!ids.length) return new Map<string, DisplayPrice>();
  const rows = await ctx.tx.query<DisplayPrice & { id: string }>(
    `SELECT v.id,e.unit_price::text AS "unitPrice",e.currency,u.code AS unit
     FROM catalog_variants v JOIN catalog_units u ON u.business_id=v.business_id AND u.id=v.base_unit_id
     JOIN LATERAL (SELECT unit_price,currency FROM price_entries WHERE business_id=v.business_id AND variant_id=v.id
       AND customer_id IS NULL AND (store_id IS NULL OR store_id=$3) AND starts_at<=now()
       AND (ends_at IS NULL OR ends_at>now()) ORDER BY (store_id IS NOT NULL) DESC,starts_at DESC,id DESC LIMIT 1) e ON true
     WHERE v.business_id=$1 AND v.id=ANY($2::uuid[])`,
    [ctx.business.id, ids, store],
  );
  return new Map(rows.rows.map(({ id, ...price }) => [id, price]));
}
