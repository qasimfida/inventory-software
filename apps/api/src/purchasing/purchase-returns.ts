import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { baseQuantity, decimal, decimalString } from '@inventory/domain';
import type { PurchaseReturn } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { detail, purchase, line } from './purchase.repository.js';

@Injectable()
export class PurchaseReturns {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  returnGoods(actor: Actor, b: string, id: string, input: PurchaseReturn) {
    return this.scope.run(actor, b, 'purchases.write', async (ctx) => {
      const order = await purchase(ctx, id);
      await this.ledger.warehouse(ctx, order.warehouseId);
      return idempotent(
        ctx,
        'purchase.return',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          const receipt = (
            await ctx.tx.query<{
              lineId: string;
              locationId: string;
              quantity: string;
              baseQuantity: string;
              returned: string;
              returnedDamaged: string;
              damaged: string;
            }>(
              `SELECT r.line_id AS "lineId",r.location_id AS "locationId",r.quantity::text,r.damaged::text,r.base_quantity::text AS "baseQuantity",
          COALESCE((SELECT sum(quantity) FROM purchase_returns WHERE business_id=r.business_id AND receipt_id=r.id),0)::text AS returned,
          COALESCE((SELECT sum(damaged) FROM purchase_returns WHERE business_id=r.business_id AND receipt_id=r.id),0)::text AS "returnedDamaged"
          FROM purchase_receipts r JOIN purchase_lines l ON l.business_id=r.business_id AND l.id=r.line_id
          WHERE r.business_id=$1 AND r.id=$2 AND l.purchase_id=$3`,
              [b, input.receiptId, id],
            )
          ).rows[0];
          if (!receipt) throw new NotFoundException();
          const quantity = decimal(input.quantity),
            damaged = decimal(input.damaged);
          if (damaged > quantity) throw new BadRequestException();
          const goodRemaining =
            decimal(receipt.quantity) -
            decimal(receipt.damaged) -
            decimal(receipt.returned) +
            decimal(receipt.returnedDamaged);
          if (
            damaged > decimal(receipt.damaged) - decimal(receipt.returnedDamaged) ||
            quantity - damaged > goodRemaining
          )
            throw new ConflictException(
              'Return exceeds remaining good or damaged receipt quantities.',
            );
          const item = await line(ctx, id, receipt.lineId),
            returnId = randomUUID();
          let base: string, damage: string;
          try {
            base = baseQuantity(input.quantity, receipt.baseQuantity, receipt.quantity);
            damage =
              damaged === 0n
                ? '0'
                : baseQuantity(input.damaged, receipt.baseQuantity, receipt.quantity);
          } catch {
            throw new BadRequestException();
          }
          const balance = (
            await ctx.tx.query<{ available: string; damaged: string }>(
              `SELECT (on_hand-reserved-damaged)::text AS available,damaged::text FROM stock_balances
           WHERE business_id=$1 AND warehouse_id=$2 AND location_id=$3 AND variant_id=$4 FOR UPDATE`,
              [b, order.warehouseId, receipt.locationId, item.variantId],
            )
          ).rows[0];
          if (
            !balance ||
            decimal(base) - decimal(damage) > decimal(balance.available) ||
            decimal(damage) > decimal(balance.damaged)
          )
            throw new ConflictException(
              'Returned goods must be physically available at the receiving location.',
            );
          const movement = await this.ledger.apply(ctx, {
            variantId: item.variantId,
            warehouseId: order.warehouseId,
            locationId: receipt.locationId,
            quantityDelta: decimalString(-decimal(base)),
            damagedDelta: decimalString(-decimal(damage)),
            type: 'purchase_return',
            sourceKind: 'purchase_return',
            sourceId: returnId,
            commandId: input.idempotencyKey,
            reason: input.reason,
          });
          await ctx.tx.query(
            `INSERT INTO purchase_returns(id,business_id,receipt_id,quantity,base_quantity,movement_id,reason,credit_reference,actor_id,damaged)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              returnId,
              b,
              input.receiptId,
              input.quantity,
              base,
              movement.id,
              input.reason,
              input.creditReference,
              actor.accountId,
              input.damaged,
            ],
          );
          return detail(ctx, id);
        },
      );
    });
  }
}
