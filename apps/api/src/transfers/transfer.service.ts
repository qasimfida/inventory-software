import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { decimal, decimalString } from '@inventory/domain';
import type { TransferInput, TransferTransition } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import { ReservationCore } from '../inventory/reservation-core.js';
import { TransferAccess } from './transfer-access.js';
import {
  getTransfer,
  transferLines,
  transferDetail,
  transferEvent,
} from './transfer.repository.js';
@Injectable()
export class TransferService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(TransferAccess) private readonly access: TransferAccess,
    @Inject(ReservationCore) private readonly reservations: ReservationCore,
  ) {}
  create(actor: Actor, b: string, input: TransferInput) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const ledger = this.access.ledger,
        source = await ledger.location(ctx, input.sourceWarehouseId, input.sourceLocationId),
        destination = await ledger.location(
          ctx,
          input.destinationWarehouseId,
          input.destinationLocationId,
        );
      if (source.id === destination.id) throw new ConflictException();
      return idempotent(ctx, 'transfer.create', input.idempotencyKey, input, async () => {
        const id = randomUUID();
        await ctx.tx.query(
          `INSERT INTO stock_transfers(id,business_id,source_warehouse_id,source_location_id,destination_warehouse_id,destination_location_id,reference,state,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,'draft',$8)`,
          [
            id,
            b,
            input.sourceWarehouseId,
            source.id,
            input.destinationWarehouseId,
            destination.id,
            input.reference,
            actor.accountId,
          ],
        );
        for (const item of input.lines) {
          const active = await ledger.catalog.active(ctx, item.variantId);
          if (!active.product.trackInventory) throw new ConflictException();
          const converted = await ledger.catalog.quantity(
            ctx,
            item.variantId,
            item.unitId,
            item.quantity,
          );
          await ctx.tx.query(
            'INSERT INTO transfer_lines(id,business_id,transfer_id,variant_id,unit_id,quantity,base_quantity) VALUES($1,$2,$3,$4,$5,$6,$7)',
            [randomUUID(), b, id, item.variantId, item.unitId, item.quantity, converted.quantity],
          );
        }
        await transferEvent(ctx, await getTransfer(ctx, id), 'created', 'Transfer draft created');
        return transferDetail(ctx, id);
      });
    });
  }
  transition(actor: Actor, b: string, id: string, input: TransferTransition) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const current = await this.access.get(ctx, id),
        ledger = this.access.ledger;
      return idempotent(
        ctx,
        'transfer.transition',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (current.version !== input.version) throw new ConflictException();
          const valid =
            input.action === 'approve'
              ? current.state === 'draft'
              : input.action === 'dispatch'
                ? current.state === 'approved'
                : ['draft', 'approved'].includes(current.state);
          if (!valid) throw new ConflictException();
          const lines = await transferLines(ctx, id);
          for (const line of lines) {
            const common = {
              variantId: line.variantId,
              warehouseId: current.sourceWarehouseId,
              locationId: current.sourceLocationId,
              quantity: line.baseQuantity,
              commandId: input.idempotencyKey,
              reason: input.reason,
            };
            if (input.action === 'approve') {
              await ledger.location(
                ctx,
                current.destinationWarehouseId,
                current.destinationLocationId,
              );
              const reservation = await this.reservations.reserve(ctx, {
                ...common,
                sourceKind: 'transfer',
                sourceId: line.id,
              });
              await ctx.tx.query(
                'UPDATE transfer_lines SET reservation_id=$1 WHERE business_id=$2 AND id=$3',
                [reservation.id, b, line.id],
              );
            } else if (input.action === 'dispatch') {
              if (!line.reservationId) throw new ConflictException();
              await this.reservations.consume(ctx, line.reservationId, line.baseQuantity);
              await ledger.apply(ctx, {
                ...common,
                quantityDelta: decimalString(-decimal(line.baseQuantity)),
                reservedDelta: decimalString(-decimal(line.baseQuantity)),
                transitDelta: line.baseQuantity,
                type: 'transfer_dispatch',
                sourceKind: 'transfer_dispatch',
                sourceId: line.id,
              });
            } else if (line.reservationId)
              await this.reservations.release(
                ctx,
                line.reservationId,
                input.idempotencyKey,
                input.reason,
              );
          }
          const state =
            input.action === 'approve'
              ? 'approved'
              : input.action === 'dispatch'
                ? 'dispatched'
                : 'cancelled';
          await ctx.tx.query(
            'UPDATE stock_transfers SET state=$1,version=version+1 WHERE business_id=$2 AND id=$3',
            [state, b, id],
          );
          await transferEvent(ctx, { ...current, state }, input.action, input.reason);
          return transferDetail(ctx, id);
        },
      );
    });
  }
}
