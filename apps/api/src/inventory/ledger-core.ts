import type { StockEntry } from './stock-entry.js';
import { lowStock } from './low-stock.js';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { decimal, decimalString } from '@inventory/domain';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { audit } from '../organization/organization.scope.js';
import { LocationAccess } from '../organization/location-access.js';
import { CatalogAccess } from '../catalog/catalog-access.js';
@Injectable()
export class LedgerCore {
  constructor(
    @Inject(CatalogAccess) readonly catalog: CatalogAccess,
    @Inject(LocationAccess) private readonly locations: LocationAccess,
  ) {}
  warehouseRecord(ctx: OrganizationContext, id: string) {
    return this.locations.warehouse(ctx, id);
  }
  async warehouse(ctx: OrganizationContext, id: string) {
    const warehouse = await this.locations.warehouse(ctx, id);
    if (warehouse.state !== 'active') throw new ConflictException();
    return warehouse;
  }
  async location(ctx: OrganizationContext, warehouseId: string, locationId: string | null) {
    const warehouse = await this.warehouse(ctx, warehouseId);
    const id = locationId ?? warehouseId;
    if (!locationId || locationId === warehouseId)
      await ctx.tx.query(
        "INSERT INTO storage_locations(id,business_id,warehouse_id,name,code) VALUES($1,$2,$1,$3,'ROOT') ON CONFLICT(id) DO NOTHING",
        [warehouseId, ctx.business.id, warehouse.name],
      );
    const row = (
      await ctx.tx.query<{ id: string }>(
        "SELECT id FROM storage_locations WHERE business_id=$1 AND warehouse_id=$2 AND id=$3 AND state='active'",
        [ctx.business.id, warehouseId, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    return { id, warehouse };
  }
  async apply(ctx: OrganizationContext, input: StockEntry, releaseOnly = false) {
    if (
      releaseOnly &&
      (input.type !== 'release' ||
        input.sourceKind !== 'reservation_release' ||
        decimal(input.quantityDelta) !== 0n ||
        decimal(input.reservedDelta ?? '0') >= 0n ||
        decimal(input.damagedDelta ?? '0') !== 0n ||
        decimal(input.transitDelta ?? '0') !== 0n ||
        !input.locationId)
    )
      throw new ConflictException();
    if (!releaseOnly) {
      const { product } = await this.catalog.active(ctx, input.variantId);
      if (!product.trackInventory) throw new ConflictException();
    }
    // Releasing an existing hold must remain possible after catalog/location deactivation.
    const target = releaseOnly
        ? { id: input.locationId!, warehouse: await this.warehouseRecord(ctx, input.warehouseId) }
        : await this.location(ctx, input.warehouseId, input.locationId),
      args = [ctx.business.id, input.variantId, input.warehouseId, target.id];
    if (
      input.type === 'opening' &&
      (
        await ctx.tx.query(
          'SELECT 1 FROM stock_movements WHERE business_id=$1 AND variant_id=$2 AND warehouse_id=$3 AND location_id=$4 LIMIT 1',
          args,
        )
      ).rowCount
    )
      throw new ConflictException();
    await ctx.tx.query(
      'INSERT INTO stock_balances(business_id,variant_id,warehouse_id,location_id) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
      args,
    );
    const before = (
      await ctx.tx.query<{
        on_hand: string;
        reserved: string;
        damaged: string;
        in_transit: string;
      }>(
        'SELECT on_hand::text,reserved::text,damaged::text,in_transit::text FROM stock_balances WHERE business_id=$1 AND variant_id=$2 AND warehouse_id=$3 AND location_id=$4 FOR UPDATE',
        args,
      )
    ).rows[0]!;
    const next = {
      onHand: decimal(before.on_hand) + decimal(input.quantityDelta),
      reserved: decimal(before.reserved) + decimal(input.reservedDelta ?? '0'),
      damaged: decimal(before.damaged) + decimal(input.damagedDelta ?? '0'),
      inTransit: decimal(before.in_transit) + decimal(input.transitDelta ?? '0'),
    };
    const policy = (
      await ctx.tx.query<{ allow_negative: boolean }>(
        'SELECT allow_negative FROM inventory_policies WHERE business_id=$1',
        [ctx.business.id],
      )
    ).rows[0];
    if (
      next.reserved < 0n ||
      next.damaged < 0n ||
      next.inTransit < 0n ||
      (next.onHand < next.reserved + next.damaged &&
        !(
          policy?.allow_negative &&
          next.onHand < 0n &&
          next.reserved === 0n &&
          next.damaged === 0n
        ))
    )
      throw new ConflictException();
    let values: string[];
    try {
      values = [next.onHand, next.reserved, next.damaged, next.inTransit].map(decimalString);
    } catch {
      throw new BadRequestException();
    }
    const id = randomUUID();
    await ctx.tx.query(
      `INSERT INTO stock_movements(id,business_id,variant_id,warehouse_id,location_id,quantity_delta,reserved_delta,damaged_delta,transit_delta,type,source_kind,source_id,command_id,actor_id,reason,reversal_of,reason_code,reason_label) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [
        id,
        ...args,
        input.quantityDelta,
        input.reservedDelta ?? '0',
        input.damagedDelta ?? '0',
        input.transitDelta ?? '0',
        input.type,
        input.sourceKind,
        input.sourceId,
        input.commandId,
        ctx.actor.accountId,
        input.reason,
        input.reversalOf ?? null,
        input.reasonCode ?? null,
        input.reasonLabel ?? null,
      ],
    );
    await ctx.tx.query(
      'UPDATE stock_balances SET on_hand=$5,reserved=$6,damaged=$7,in_transit=$8,version=version+1 WHERE business_id=$1 AND variant_id=$2 AND warehouse_id=$3 AND location_id=$4',
      [...args, ...values],
    );
    await audit(ctx, id, 'stock.movement', null, {
      ...input,
      storeId: target.warehouse.storeId,
      locationId: target.id,
    });
    await lowStock(ctx, input);
    return this.movement(ctx, id, releaseOnly);
  }
  async movement(ctx: OrganizationContext, id: string, releaseOnly = false) {
    const row = (
      await ctx.tx.query<{
        id: string;
        variantId: string;
        warehouseId: string;
        locationId: string;
        quantityDelta: string;
        reservedDelta: string;
        damagedDelta: string;
        transitDelta: string;
        type: string;
        sourceKind: string;
        sourceId: string;
        actorId: string;
        reason: string;
        createdAt: Date;
        reversalOf: string | null;
      }>(`SELECT ${movementProjection} FROM stock_movements WHERE business_id=$1 AND id=$2`, [
        ctx.business.id,
        id,
      ])
    ).rows[0];
    if (!row) throw new NotFoundException();
    if (releaseOnly) await this.warehouseRecord(ctx, row.warehouseId);
    else await this.warehouse(ctx, row.warehouseId);
    return { ...row, createdAt: row.createdAt.toISOString() };
  }
}
export const movementProjection = `id,variant_id AS "variantId",warehouse_id AS "warehouseId",location_id AS "locationId",quantity_delta::text AS "quantityDelta",reserved_delta::text AS "reservedDelta",damaged_delta::text AS "damagedDelta",transit_delta::text AS "transitDelta",type,source_kind AS "sourceKind",source_id AS "sourceId",actor_id AS "actorId",reason,reason_code AS "reasonCode",reason_label AS "reasonLabel",created_at AS "createdAt",reversal_of AS "reversalOf"`;
