import { Injectable } from '@nestjs/common';
import type { OrganizationContext } from '../organization/organization.scope.js';
import type { SaleQuery } from '@inventory/contracts';
@Injectable()
export class CatalogSearch {
  async pos(ctx: OrganizationContext, q: SaleQuery) {
    const rows = (
      await ctx.tx.query(
        `
      SELECT v.id,v.name,v.sku,p.images,v.sale_unit_id AS "unitId",
        CASE WHEN price.id IS NULL THEN NULL ELSE json_build_object('unitPrice',price.unit_price::text,'currency',price.currency,'unit',base.code) END price,
        (SELECT json_agg(json_build_object('id',u.id,'code',u.code) ORDER BY u.code) FROM catalog_units u
         WHERE u.business_id=v.business_id AND (u.id=v.base_unit_id OR EXISTS(SELECT 1 FROM catalog_conversions c WHERE c.business_id=v.business_id AND c.variant_id=v.id AND c.unit_id=u.id))) AS units
      FROM catalog_variants v JOIN catalog_products p ON p.business_id=v.business_id AND p.id=v.product_id
      JOIN catalog_units base ON base.business_id=v.business_id AND base.id=v.base_unit_id
      JOIN warehouses wh ON wh.business_id=v.business_id AND wh.id=$5
      LEFT JOIN LATERAL (SELECT e.id,e.unit_price,e.currency FROM price_entries e WHERE e.business_id=v.business_id AND e.variant_id=v.id
        AND e.customer_id IS NULL AND (e.store_id IS NULL OR e.store_id=wh.store_id)
        AND e.starts_at<=now() AND (e.ends_at IS NULL OR e.ends_at>now())
        ORDER BY (e.store_id IS NOT NULL) DESC,e.starts_at DESC,e.id DESC LIMIT 1) price ON true
      LEFT JOIN LATERAL (SELECT COALESCE(sum(on_hand-reserved-damaged),0) available FROM stock_balances s
        WHERE s.business_id=v.business_id AND s.variant_id=v.id AND s.warehouse_id=wh.id) stock ON true
      WHERE v.business_id=$1 AND v.state='active' AND p.state='active'
        AND (v.name ILIKE $2 OR v.sku ILIKE $2 OR EXISTS(SELECT 1 FROM catalog_identifiers i WHERE i.business_id=v.business_id AND (i.variant_id=v.id OR (i.variant_id IS NULL AND i.product_id=p.id)) AND i.code=upper($9)))
        AND ($3='' OR EXISTS(SELECT 1 FROM catalog_identifiers i WHERE i.business_id=v.business_id AND (i.variant_id=v.id OR (i.variant_id IS NULL AND i.product_id=p.id)) AND i.code=$3))
        AND ($6::text IS NULL OR price.id IS NULL OR price.currency=$6) AND ($7::uuid IS NULL OR p.category_id=$7)
        AND ($8='all' OR ($8='in-stock' AND stock.available>0) OR ($8='out-of-stock' AND stock.available<=0))
      ORDER BY v.sku,v.id LIMIT 26 OFFSET $4`,
        [
          ctx.business.id,
          `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
          q.code,
          q.offset,
          q.warehouseId,
          q.currency ?? null,
          q.categoryId ?? null,
          q.availability,
          q.search,
        ],
      )
    ).rows;
    const categories = (
      await ctx.tx.query(
        "SELECT id,name FROM catalog_categories WHERE business_id=$1 AND state='active' ORDER BY name,id LIMIT 100",
        [ctx.business.id],
      )
    ).rows;
    return { items: rows.slice(0, 25), categories, hasMore: rows.length > 25, offset: q.offset };
  }
}
