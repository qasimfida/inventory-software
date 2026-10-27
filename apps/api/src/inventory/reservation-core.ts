import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { decimal, decimalString } from '@inventory/domain';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { LedgerCore } from './ledger-core.js';
interface Reservation {
  id: string;
  variantId: string;
  warehouseId: string;
  locationId: string;
  quantity: string;
  remaining: string;
  state: string;
  sourceKind: string;
  sourceId: string;
}
@Injectable()
export class ReservationCore {
  constructor(@Inject(LedgerCore) private readonly ledger: LedgerCore) {}
  async get(ctx: OrganizationContext, id: string, releasing = false) {
    const row = (
      await ctx.tx.query<Reservation>(
        'SELECT id,variant_id AS "variantId",warehouse_id AS "warehouseId",location_id AS "locationId",quantity::text,remaining::text,state,source_kind AS "sourceKind",source_id AS "sourceId" FROM stock_reservations WHERE business_id=$1 AND id=$2 FOR UPDATE',
        [ctx.business.id, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    if (releasing) await this.ledger.warehouseRecord(ctx, row.warehouseId);
    else await this.ledger.warehouse(ctx, row.warehouseId);
    return row;
  }
  async reserve(
    ctx: OrganizationContext,
    input: {
      variantId: string;
      warehouseId: string;
      locationId: string | null;
      quantity: string;
      sourceKind: string;
      sourceId: string;
      commandId: string;
      reason: string;
    },
  ) {
    const id = randomUUID();
    const movement = await this.ledger.apply(ctx, {
      ...input,
      quantityDelta: '0',
      reservedDelta: input.quantity,
      type: 'reserve',
      sourceKind: 'reservation',
      sourceId: id,
    });
    await ctx.tx.query(
      "INSERT INTO stock_reservations(id,business_id,variant_id,warehouse_id,location_id,quantity,remaining,state,source_kind,source_id,actor_id) VALUES($1,$2,$3,$4,$5,$6,$6,'active',$7,$8,$9)",
      [
        id,
        ctx.business.id,
        input.variantId,
        input.warehouseId,
        movement.locationId,
        input.quantity,
        input.sourceKind,
        input.sourceId,
        ctx.actor.accountId,
      ],
    );
    return { id, quantity: input.quantity, locationId: movement.locationId };
  }
  async release(ctx: OrganizationContext, id: string, commandId: string, reason: string) {
    const reservation = await this.get(ctx, id, true);
    if (reservation.state !== 'active') throw new ConflictException();
    await this.ledger.apply(
      ctx,
      {
        ...reservation,
        quantityDelta: '0',
        reservedDelta: decimalString(-decimal(reservation.remaining)),
        type: 'release',
        sourceKind: 'reservation_release',
        sourceId: commandId,
        commandId,
        reason,
      },
      true,
    );
    await ctx.tx.query(
      "UPDATE stock_reservations SET remaining=0,state='released' WHERE business_id=$1 AND id=$2",
      [ctx.business.id, id],
    );
    return { ok: true };
  }
  // The caller posts the physical movement and reservation delta in the same transaction.
  async consume(ctx: OrganizationContext, id: string, quantity: string) {
    const reservation = await this.get(ctx, id);
    const remaining = decimal(reservation.remaining) - decimal(quantity);
    if (reservation.state !== 'active' || decimal(quantity) <= 0n || remaining < 0n)
      throw new ConflictException();
    await ctx.tx.query(
      'UPDATE stock_reservations SET remaining=$1,state=$2 WHERE business_id=$3 AND id=$4',
      [decimalString(remaining), remaining === 0n ? 'consumed' : 'active', ctx.business.id, id],
    );
    return reservation;
  }
}
