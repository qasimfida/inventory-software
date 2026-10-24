import { Inject, Injectable } from '@nestjs/common';
import { stockOverview } from './stock-overview.js';
import type { StockOverviewQuery } from '@inventory/contracts';
import type { StockQuery } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LedgerCore, movementProjection } from './ledger-core.js';
@Injectable()
export class InventoryQueries {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  overview(actor: Actor, b: string, q: StockOverviewQuery) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      await this.ledger.warehouse(ctx, q.warehouseId);
      for (const id of q.warehouseIds ?? []) await this.ledger.warehouse(ctx, id);
      return stockOverview(ctx, q);
    });
  }
  workspace(actor: Actor, b: string, q: StockQuery) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      await this.ledger.warehouse(ctx, q.warehouseId);
      const search = `%${q.search.replace(/[\\%_]/g, '\\$&')}%`;
      const items = (
        await ctx.tx.query(
          "SELECT v.id,v.name,v.sku,v.base_unit_id AS \"baseUnitId\" FROM catalog_variants v JOIN catalog_products p ON p.business_id=v.business_id AND p.id=v.product_id WHERE v.business_id=$1 AND v.state='active' AND p.state='active' AND p.track_inventory AND (v.name ILIKE $2 OR v.sku ILIKE $2) ORDER BY v.sku,v.id LIMIT $3 OFFSET $4",
          [b, search, q.limit, q.offset],
        )
      ).rows;
      const units = (
        await ctx.tx.query(
          'SELECT id,name,code FROM catalog_units WHERE business_id=$1 ORDER BY name,id',
          [b],
        )
      ).rows;
      const locations = (
        await ctx.tx.query(
          "SELECT id,name,code FROM storage_locations WHERE business_id=$1 AND warehouse_id=$2 AND state='active' ORDER BY code,id",
          [b, q.warehouseId],
        )
      ).rows;
      const balances = (
        await ctx.tx.query(
          `SELECT s.variant_id AS "variantId",v.sku,s.location_id AS "locationId",l.name AS "locationName",s.on_hand::text AS "onHand",s.reserved::text,s.damaged::text,s.in_transit::text AS "inTransit",(s.on_hand-s.reserved-s.damaged)::text AS available,s.version FROM stock_balances s JOIN catalog_variants v ON v.business_id=s.business_id AND v.id=s.variant_id JOIN storage_locations l ON l.business_id=s.business_id AND l.id=s.location_id WHERE s.business_id=$1 AND s.warehouse_id=$2 AND (v.name ILIKE $3 OR v.sku ILIKE $3) ORDER BY v.sku,s.location_id LIMIT $4 OFFSET $5`,
          [b, q.warehouseId, search, q.limit, q.offset],
        )
      ).rows;
      const history = (
        await ctx.tx.query<{ createdAt: Date; sequence: string }>(
          `SELECT ${movementProjection},sequence::text FROM stock_movements WHERE business_id=$1 AND warehouse_id=$2 AND ($3::bigint IS NULL OR sequence<$3::bigint) ORDER BY sequence DESC LIMIT 51`,
          [b, q.warehouseId, q.cursor ?? null],
        )
      ).rows;
      const movements = history
        .slice(0, 50)
        .map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
      const reservations = (
        await ctx.tx.query(
          'SELECT id,variant_id AS "variantId",quantity::text,remaining::text,state,location_id AS "locationId" FROM stock_reservations WHERE business_id=$1 AND warehouse_id=$2 AND state=\'active\' ORDER BY created_at,id LIMIT $3 OFFSET $4',
          [b, q.warehouseId, q.limit, q.offset],
        )
      ).rows;
      const policy = (
        await ctx.tx.query(
          'SELECT allow_negative AS "allowNegative",version FROM inventory_policies WHERE business_id=$1',
          [b],
        )
      ).rows[0] ?? { allowNegative: false, version: 1 };
      const itemCount = await ctx.tx.query(
        "SELECT count(*) FROM catalog_variants v JOIN catalog_products p ON p.business_id=v.business_id AND p.id=v.product_id WHERE v.business_id=$1 AND v.state='active' AND p.state='active' AND p.track_inventory AND (v.name ILIKE $2 OR v.sku ILIKE $2)",
        [b, search],
      );
      const balanceCount = await ctx.tx.query(
        'SELECT count(*) FROM stock_balances s JOIN catalog_variants v ON v.business_id=s.business_id AND v.id=s.variant_id WHERE s.business_id=$1 AND s.warehouse_id=$2 AND (v.name ILIKE $3 OR v.sku ILIKE $3)',
        [b, q.warehouseId, search],
      );
      const reservationCount = await ctx.tx.query(
        "SELECT count(*) FROM stock_reservations WHERE business_id=$1 AND warehouse_id=$2 AND state='active'",
        [b, q.warehouseId],
      );
      const totals = {
        items: Number(itemCount.rows[0]?.count ?? 0),
        balances: Number(balanceCount.rows[0]?.count ?? 0),
        reservations: Number(reservationCount.rows[0]?.count ?? 0),
      };
      return {
        totals,
        limit: q.limit,
        offset: q.offset,
        hasMore: Math.max(...Object.values(totals)) > q.offset + q.limit,
        items,
        units,
        locations,
        balances,
        movements,
        reservations,
        policy,
        nextCursor: history.length > 50 ? history[49]!.sequence : null,
      };
    });
  }
  reconcile(actor: Actor, b: string, warehouseId: string) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      await this.ledger.warehouse(ctx, warehouseId);
      const result = await ctx.tx.query(
        `WITH totals AS (SELECT variant_id,location_id,sum(quantity_delta) AS on_hand,sum(reserved_delta) AS reserved,sum(damaged_delta) AS damaged,sum(transit_delta) AS in_transit FROM stock_movements WHERE business_id=$1 AND warehouse_id=$2 GROUP BY variant_id,location_id), balances AS (SELECT * FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2) SELECT coalesce(t.variant_id,b.variant_id) AS "variantId",coalesce(t.location_id,b.location_id) AS "locationId" FROM totals t FULL JOIN balances b ON t.variant_id=b.variant_id AND t.location_id=b.location_id WHERE coalesce(t.on_hand,0)<>coalesce(b.on_hand,0) OR coalesce(t.reserved,0)<>coalesce(b.reserved,0) OR coalesce(t.damaged,0)<>coalesce(b.damaged,0) OR coalesce(t.in_transit,0)<>coalesce(b.in_transit,0)`,
        [b, warehouseId],
      );
      const reservations = await ctx.tx.query(
        `WITH held AS (SELECT variant_id,location_id,sum(remaining) AS quantity FROM stock_reservations WHERE business_id=$1 AND warehouse_id=$2 AND state='active' GROUP BY variant_id,location_id), balances AS (SELECT * FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2) SELECT coalesce(h.variant_id,b.variant_id) AS "variantId",coalesce(h.location_id,b.location_id) AS "locationId" FROM held h FULL JOIN balances b ON h.variant_id=b.variant_id AND h.location_id=b.location_id WHERE coalesce(h.quantity,0)<>coalesce(b.reserved,0)`,
        [b, warehouseId],
      );
      const mismatches = [...result.rows, ...reservations.rows];
      return { consistent: mismatches.length === 0, mismatches };
    });
  }
}
