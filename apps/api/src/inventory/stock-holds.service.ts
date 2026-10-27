import { Inject, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { OrderHoldInput, StockCommand } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import { LedgerCore } from './ledger-core.js';
import { ReservationCore } from './reservation-core.js';
export const holdProjection = `SELECT h.id,h.reference,h.warehouse_id AS "warehouseId",r.variant_id AS "variantId",r.id AS "reservationId",r.quantity::text,r.remaining::text,h.state,h.expires_at AS "expiresAt",h.created_at AS "createdAt",h.created_by AS "createdBy" FROM stock_hold_orders h JOIN stock_reservations r ON r.business_id=h.business_id AND r.id=h.reservation_id`;
@Injectable()
export class StockHoldsService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
    @Inject(ReservationCore) private readonly reservations: ReservationCore,
  ) {}
  create(actor: Actor, b: string, input: OrderHoldInput) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      await this.ledger.warehouse(ctx, input.warehouseId);
      return idempotent(ctx, 'stock.hold', input.idempotencyKey, input, async () => {
        const converted = await this.ledger.catalog.quantity(
            ctx,
            input.variantId,
            input.unitId,
            input.quantity,
          ),
          id = randomUUID();
        const reservation = await this.reservations.reserve(ctx, {
          ...input,
          quantity: converted.quantity,
          sourceKind: 'order_hold',
          sourceId: id,
          commandId: input.idempotencyKey,
        });
        await ctx.tx.query(
          "INSERT INTO stock_hold_orders(id,business_id,warehouse_id,reference,reservation_id,expires_at,created_by) VALUES($1,$2,$3,$4,$5,now()+$6*interval '1 minute',$7)",
          [
            id,
            b,
            input.warehouseId,
            input.reference,
            reservation.id,
            input.expiresInMinutes,
            actor.accountId,
          ],
        );
        await audit(ctx, id, 'stock.hold.created', null, { ...input, sourceId: id });
        return { id };
      });
    });
  }
  cancel(actor: Actor, b: string, id: string, input: StockCommand) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const row = (
        await ctx.tx.query(
          'SELECT warehouse_id FROM stock_hold_orders WHERE business_id=$1 AND id=$2',
          [b, id],
        )
      ).rows[0];
      if (!row) throw new NotFoundException();
      await this.ledger.warehouseRecord(ctx, row.warehouse_id);
      return idempotent(ctx, 'stock.hold.cancel', input.idempotencyKey, { ...input, id }, () =>
        this.close(ctx, id, 'cancelled', input.idempotencyKey, input.reason),
      );
    });
  }
  async close(
    ctx: OrganizationContext,
    id: string,
    state: 'cancelled' | 'expired',
    commandId: string,
    reason: string,
  ) {
    const row = (
      await ctx.tx.query<{ reservation_id: string; state: string; warehouse_id: string }>(
        'SELECT reservation_id,state,warehouse_id FROM stock_hold_orders WHERE business_id=$1 AND id=$2 FOR UPDATE',
        [ctx.business.id, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    if (row.state !== 'open') throw new ConflictException('This order hold has already closed.');
    await this.reservations.release(ctx, row.reservation_id, commandId, reason);
    await ctx.tx.query('UPDATE stock_hold_orders SET state=$3 WHERE business_id=$1 AND id=$2', [
      ctx.business.id,
      id,
      state,
    ]);
    await audit(
      ctx,
      id,
      `stock.hold.${state}`,
      { state: 'open' },
      { state, warehouseId: row.warehouse_id, automated: state === 'expired' },
    );
    return { ok: true };
  }
}
