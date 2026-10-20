import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { decimal, decimalString } from '@inventory/domain';
import type { StorageInput, StorageQuery, StorageMove } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { idempotent } from '../database/idempotency.js';
const projection = `id,warehouse_id AS "warehouseId",parent_id AS "parentId",name,code,type,state,notes,photos,capacity::text,capacity_unit AS "capacityUnit",version`;
@Injectable()
export class StorageService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  load(actor: Actor, b: string, q: StorageQuery) {
    return this.scope.run(actor, b, 'stock.read', async (ctx) => {
      const wh = await this.ledger.warehouse(ctx, q.warehouseId);
      const rows = (
        await ctx.tx.query(
          `SELECT ${projection} FROM storage_locations WHERE business_id=$1 AND warehouse_id=$2 AND (name ILIKE $3 OR code ILIKE $3) AND ($4::text IS NULL OR type=$4) AND ($5::text IS NULL OR state=$5) ORDER BY code,id LIMIT 51 OFFSET $6`,
          [
            b,
            q.warehouseId,
            `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
            q.type ?? null,
            q.state ?? null,
            q.offset,
          ],
        )
      ).rows;
      // A newly created warehouse has a virtual empty root until its first storage/stock write.
      if (
        !q.search &&
        !q.type &&
        !q.state &&
        q.offset === 0 &&
        !(
          await ctx.tx.query('SELECT 1 FROM storage_locations WHERE business_id=$1 AND id=$2', [
            b,
            q.warehouseId,
          ])
        ).rowCount
      )
        rows.unshift({
          id: wh.id,
          warehouseId: wh.id,
          parentId: null,
          name: wh.name,
          code: 'ROOT',
          type: 'warehouse',
          state: 'active',
          notes: '',
          photos: [],
          capacity: null,
          capacityUnit: '',
          version: 1,
        });
      const totals = (
        await ctx.tx.query(
          `SELECT variant_id AS "variantId",sum(on_hand)::text AS "onHand",sum(reserved)::text AS reserved,sum(damaged)::text AS damaged,sum(in_transit)::text AS "inTransit" FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2 GROUP BY variant_id ORDER BY variant_id LIMIT 51 OFFSET $3`,
          [b, q.warehouseId, q.offset],
        )
      ).rows;
      return {
        locations: rows.slice(0, 50),
        hasMore: rows.length > 50 || totals.length > 50,
        offset: q.offset,
        totals: totals.slice(0, 50),
      };
    });
  }
  save(actor: Actor, b: string, input: StorageInput, id?: string, version?: number) {
    return this.scope.run(actor, b, 'locations.write', async (ctx) => {
      const wh = await this.ledger.warehouse(ctx, input.warehouseId);
      await this.ledger.location(ctx, input.warehouseId, input.parentId);
      const target = id ?? randomUUID();
      if (target === input.warehouseId) throw new ConflictException();
      const values = [
        input.parentId,
        input.name,
        input.code,
        input.type,
        input.state,
        input.notes,
        JSON.stringify(input.photos),
        input.capacity,
        input.capacityUnit,
        b,
        input.warehouseId,
        target,
      ];
      if (id) {
        const result = await ctx.tx.query(
          `UPDATE storage_locations SET parent_id=$1,name=$2,code=$3,type=$4,state=$5,notes=$6,photos=$7,capacity=$8,capacity_unit=$9,version=version+1 WHERE business_id=$10 AND warehouse_id=$11 AND id=$12 AND version=$13 AND state<>'archived' RETURNING id`,
          [...values, version],
        );
        if (!result.rowCount) throw new ConflictException();
      } else
        await ctx.tx.query(
          `INSERT INTO storage_locations(parent_id,name,code,type,state,notes,photos,capacity,capacity_unit,business_id,warehouse_id,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          values,
        );
      await audit(ctx, target, 'storage.saved', null, {
        ...input,
        id: target,
        storeId: wh.storeId,
      });
      return { id: target };
    });
  }
  move(actor: Actor, b: string, input: StorageMove) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      await this.ledger.location(ctx, input.warehouseId, input.sourceId);
      await this.ledger.location(ctx, input.warehouseId, input.destinationId);
      return idempotent(ctx, 'storage.move', input.idempotencyKey, input, async () => {
        const qty = await this.ledger.catalog.quantity(
          ctx,
          input.variantId,
          input.unitId,
          input.quantity,
        );
        // Moves cannot manufacture quantity by using the negative-stock allowance.
        const available = (
          await ctx.tx.query<{ available: string }>(
            `SELECT (on_hand-reserved-damaged)::text AS available FROM stock_balances WHERE business_id=$1 AND variant_id=$2 AND warehouse_id=$3 AND location_id=$4`,
            [b, input.variantId, input.warehouseId, input.sourceId],
          )
        ).rows[0];
        if (!available || decimal(available.available) < decimal(qty.quantity))
          throw new ConflictException();
        const common = {
          variantId: input.variantId,
          warehouseId: input.warehouseId,
          sourceKind: 'location_move',
          sourceId: input.idempotencyKey,
          commandId: input.idempotencyKey,
          reason: input.reason,
        };
        const out = await this.ledger.apply(ctx, {
          ...common,
          locationId: input.sourceId,
          quantityDelta: decimalString(-decimal(qty.quantity)),
          type: 'location_out',
        });
        const incoming = await this.ledger.apply(ctx, {
          ...common,
          locationId: input.destinationId,
          quantityDelta: qty.quantity,
          type: 'location_in',
        });
        return { movementIds: [out.id, incoming.id] };
      });
    });
  }
}
