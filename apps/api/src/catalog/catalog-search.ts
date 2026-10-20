import { Injectable } from '@nestjs/common';
import type { OrganizationContext } from '../organization/organization.scope.js';
import type { SaleQuery } from '@inventory/contracts';
@Injectable()
export class CatalogSearch {
  async pos(ctx: OrganizationContext, q: SaleQuery) {
    const rows = (
      await ctx.tx.query(
        `SELECT v.id,v.name,v.sku,v.sale_unit_id AS "unitId",(SELECT json_agg(json_build_object('id',u.id,'code',u.code) ORDER BY u.code) FROM catalog_units u WHERE u.business_id=v.business_id AND (u.id=v.base_unit_id OR EXISTS(SELECT 1 FROM catalog_conversions c WHERE c.business_id=v.business_id AND c.variant_id=v.id AND c.unit_id=u.id))) AS units FROM catalog_variants v JOIN catalog_products p ON p.business_id=v.business_id AND p.id=v.product_id WHERE v.business_id=$1 AND v.state='active' AND p.state='active' AND (v.name ILIKE $2 OR v.sku ILIKE $2) AND ($3='' OR EXISTS(SELECT 1 FROM catalog_identifiers i WHERE i.business_id=v.business_id AND coalesce(i.variant_id,i.product_id)=v.id AND i.code=$3)) ORDER BY v.sku,v.id LIMIT 26 OFFSET $4`,
        [ctx.business.id, `%${q.search.replace(/[\\%_]/g, '\\$&')}%`, q.code, q.offset],
      )
    ).rows;
    return { items: rows.slice(0, 25), hasMore: rows.length > 25, offset: q.offset };
  }
}
