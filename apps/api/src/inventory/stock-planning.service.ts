import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { builtInStockReasons } from '@inventory/contracts';
import type { ReorderInput, StockReasonInput, StockQuery } from '@inventory/contracts';
import { decimal } from '@inventory/domain';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LedgerCore } from './ledger-core.js';
import { stockReasons } from './stock-reasons.js';
import { holdProjection } from './stock-holds.service.js';
@Injectable()
export class StockPlanningService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  read(actor: Actor, b: string, q: StockQuery) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      await this.ledger.warehouse(ctx, q.warehouseId);
      const reorders = (
        await ctx.tx.query(
          `SELECT p.variant_id AS "variantId",p.warehouse_id AS "warehouseId",p.location_id AS "locationId",p.reorder_point::text AS "reorderPoint",p.target_quantity::text AS "targetQuantity",p.active,p.version,v.sku,l.name AS "locationName",coalesce(s.on_hand-s.reserved-s.damaged,0)::text AS available,(p.active AND coalesce(s.on_hand-s.reserved-s.damaged,0)<=p.reorder_point) AS "needsReorder" FROM stock_reorder_policies p JOIN catalog_variants v ON v.business_id=p.business_id AND v.id=p.variant_id JOIN storage_locations l ON l.business_id=p.business_id AND l.id=p.location_id LEFT JOIN stock_balances s ON s.business_id=p.business_id AND s.variant_id=p.variant_id AND s.location_id=p.location_id AND s.warehouse_id=p.warehouse_id WHERE p.business_id=$1 AND p.warehouse_id=$2 ORDER BY v.sku,p.location_id LIMIT $3 OFFSET $4`,
          [b, q.warehouseId, q.limit + 1, q.offset],
        )
      ).rows;
      const holds = (
        await ctx.tx.query(
          `${holdProjection} WHERE h.business_id=$1 AND h.warehouse_id=$2 ORDER BY h.created_at DESC,h.id LIMIT $3 OFFSET $4`,
          [b, q.warehouseId, q.limit + 1, q.offset],
        )
      ).rows;
      return {
        reasons: await stockReasons(ctx),
        reorders: reorders.slice(0, q.limit),
        holds: holds.slice(0, q.limit).map((h) => ({
          ...h,
          createdAt: h.createdAt.toISOString(),
          expiresAt: h.expiresAt.toISOString(),
        })),
        offset: q.offset,
        hasMore: reorders.length > q.limit || holds.length > q.limit,
      };
    });
  }
  reason(actor: Actor, b: string, input: StockReasonInput) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      if (ctx.business.scope?.storeId || ctx.business.scope?.warehouseId)
        throw new ForbiddenException();
      if (builtInStockReasons.some((r) => r.code === input.code))
        throw new BadRequestException('Built-in reason codes cannot be changed.');
      const current = (
        await ctx.tx.query(
          'SELECT version FROM stock_reason_codes WHERE business_id=$1 AND code=$2',
          [b, input.code],
        )
      ).rows[0];
      if ((current?.version ?? 0) !== input.version)
        throw new ConflictException('Reason changed. Reload before saving.');
      if (
        !current &&
        Number(
          (await ctx.tx.query('SELECT count(*) FROM stock_reason_codes WHERE business_id=$1', [b]))
            .rows[0]?.count ?? 0,
        ) >= 100
      )
        throw new BadRequestException('At most 100 custom reason codes are supported.');
      await ctx.tx.query(
        `INSERT INTO stock_reason_codes(business_id,code,label,directions,active) VALUES($1,$2,$3,$4,$5) ON CONFLICT(business_id,code) DO UPDATE SET label=excluded.label,directions=excluded.directions,active=excluded.active,version=stock_reason_codes.version+1`,
        [b, input.code, input.label, input.directions, input.active],
      );
      await audit(ctx, b, 'stock.reason.updated', current, input);
      return { ok: true };
    });
  }
  reorder(actor: Actor, b: string, input: ReorderInput) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      if (ctx.business.scope?.storeId || ctx.business.scope?.warehouseId)
        throw new ForbiddenException();
      if (decimal(input.targetQuantity) < decimal(input.reorderPoint))
        throw new BadRequestException('Target quantity must be at least the reorder point.');
      await this.ledger.catalog.active(ctx, input.variantId);
      const location = await this.ledger.location(ctx, input.warehouseId, input.locationId),
        args = [b, input.variantId, input.warehouseId, location.id];
      const current = (
        await ctx.tx.query(
          'SELECT version FROM stock_reorder_policies WHERE business_id=$1 AND variant_id=$2 AND warehouse_id=$3 AND location_id=$4',
          args,
        )
      ).rows[0];
      if ((current?.version ?? 0) !== input.version)
        throw new ConflictException('Reorder policy changed. Reload before saving.');
      await ctx.tx.query(
        `INSERT INTO stock_reorder_policies(business_id,variant_id,warehouse_id,location_id,reorder_point,target_quantity,active) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(business_id,variant_id,warehouse_id,location_id) DO UPDATE SET reorder_point=excluded.reorder_point,target_quantity=excluded.target_quantity,active=excluded.active,version=stock_reorder_policies.version+1`,
        [...args, input.reorderPoint, input.targetQuantity, input.active],
      );
      await audit(ctx, input.variantId, 'stock.reorder.updated', current, {
        ...input,
        locationId: location.id,
      });
      return { ok: true };
    });
  }
}
