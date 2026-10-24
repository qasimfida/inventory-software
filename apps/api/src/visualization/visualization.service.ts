import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { defaultIndustry } from '@inventory/contracts';
import type { WarehouseViewQuery } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LocationAccess } from '../organization/location-access.js';
import { readPolicy } from '../settings/settings-store.js';
const projection = 'id,parent_id AS "parentId",name,code,type,state';
@Injectable()
export class VisualizationService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LocationAccess) private readonly locations: LocationAccess,
  ) {}
  load(actor: Actor, b: string, q: WarehouseViewQuery) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      const warehouse = await this.locations.warehouse(ctx, q.warehouseId),
        location = q.locationId ?? warehouse.id;
      let node = (
        await ctx.tx.query(
          `SELECT ${projection} FROM storage_locations WHERE business_id=$1 AND warehouse_id=$2 AND id=$3`,
          [b, warehouse.id, location],
        )
      ).rows[0];
      if (!node && location === warehouse.id)
        node = {
          id: warehouse.id,
          parentId: null,
          name: warehouse.name,
          code: warehouse.code,
          type: 'warehouse',
          state: warehouse.state,
        };
      if (!node) throw new NotFoundException();
      const children = (
        await ctx.tx.query(
          `SELECT ${projection} FROM storage_locations WHERE business_id=$1 AND warehouse_id=$2 AND parent_id=$3 ORDER BY code,id LIMIT 51 OFFSET $4`,
          [b, warehouse.id, location, q.offset],
        )
      ).rows;
      const threshold =
        (await readPolicy(ctx.tx, b)).values.industry?.lowStockThreshold ??
        defaultIndustry.lowStockThreshold;
      const stock = (
        await ctx.tx.query(
          `SELECT s.variant_id AS "variantId",v.sku,u.code AS unit,s.on_hand::text AS "onHand",
        (s.on_hand-s.reserved-s.damaged)::text AS available,s.damaged::text,s.on_hand-s.reserved-s.damaged<=$4::numeric AS low
        FROM stock_balances s JOIN catalog_variants v ON v.business_id=s.business_id AND v.id=s.variant_id
        JOIN catalog_units u ON u.business_id=v.business_id AND u.id=v.base_unit_id
        WHERE s.business_id=$1 AND s.warehouse_id=$2 AND s.location_id=$3 ORDER BY v.sku,v.id LIMIT 51 OFFSET $5`,
          [b, warehouse.id, location, threshold, q.stockOffset],
        )
      ).rows;
      return {
        node,
        children: children.slice(0, 50),
        hasMore: children.length > 50,
        stock: stock.slice(0, 50),
        stockHasMore: stock.length > 50,
      };
    });
  }
}
