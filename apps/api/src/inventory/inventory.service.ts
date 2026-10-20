import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { decimal, decimalString } from '@inventory/domain';
import type { MovementInput, ReservationInput, StockCommand } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import { LedgerCore } from './ledger-core.js';
import { ReservationCore } from './reservation-core.js';
@Injectable()
export class InventoryService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
    @Inject(ReservationCore) private readonly reservations: ReservationCore,
  ) {}
  post(actor: Actor, b: string, input: MovementInput) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      await this.ledger.warehouse(ctx, input.warehouseId);
      return idempotent(ctx, 'stock.post', input.idempotencyKey, input, async () => {
        const converted = await this.ledger.catalog.quantity(
            ctx,
            input.variantId,
            input.unitId,
            input.quantity,
          ),
          q = decimal(converted.quantity);
        const negative = ['sale', 'adjustment_out'].includes(input.type),
          damage = input.type === 'damage',
          restore = input.type === 'restore';
        return this.ledger.apply(ctx, {
          ...input,
          quantityDelta: damage || restore ? '0' : decimalString(negative ? -q : q),
          damagedDelta: damage ? converted.quantity : restore ? decimalString(-q) : '0',
          sourceKind: 'manual',
          sourceId: input.idempotencyKey,
          commandId: input.idempotencyKey,
        });
      });
    });
  }
  reverse(actor: Actor, b: string, id: string, input: StockCommand) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const original = await this.ledger.movement(ctx, id);
      if (original.sourceKind !== 'manual' || original.reversalOf) throw new ConflictException();
      return idempotent(ctx, 'stock.reverse', input.idempotencyKey, { ...input, id }, () =>
        this.ledger.apply(ctx, {
          ...original,
          quantityDelta: decimalString(-decimal(original.quantityDelta)),
          reservedDelta: decimalString(-decimal(original.reservedDelta)),
          damagedDelta: decimalString(-decimal(original.damagedDelta)),
          transitDelta: decimalString(-decimal(original.transitDelta)),
          type: 'reversal',
          sourceKind: 'reversal',
          sourceId: input.idempotencyKey,
          commandId: input.idempotencyKey,
          reason: input.reason,
          reversalOf: id,
        }),
      );
    });
  }
  reserve(actor: Actor, b: string, input: ReservationInput) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      await this.ledger.warehouse(ctx, input.warehouseId);
      return idempotent(ctx, 'stock.reserve', input.idempotencyKey, input, async () => {
        const converted = await this.ledger.catalog.quantity(
          ctx,
          input.variantId,
          input.unitId,
          input.quantity,
        );
        return this.reservations.reserve(ctx, {
          ...input,
          quantity: converted.quantity,
          sourceKind: 'manual',
          sourceId: input.idempotencyKey,
          commandId: input.idempotencyKey,
        });
      });
    });
  }
  release(actor: Actor, b: string, id: string, input: StockCommand) {
    return this.scope.run(actor, b, 'stock.write', async (ctx) => {
      const reservation = await this.reservations.get(ctx, id);
      if (reservation.sourceKind !== 'manual') throw new ConflictException();
      return idempotent(ctx, 'stock.release', input.idempotencyKey, { ...input, id }, () =>
        this.reservations.release(ctx, id, input.idempotencyKey, input.reason),
      );
    });
  }
  policy(actor: Actor, b: string, input: { allowNegative: boolean; version: number }) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      if (ctx.business.scope?.storeId) throw new ConflictException();
      await ctx.tx.query(
        'INSERT INTO inventory_policies(business_id) VALUES($1) ON CONFLICT DO NOTHING',
        [b],
      );
      if (
        !input.allowNegative &&
        (
          await ctx.tx.query(
            'SELECT 1 FROM stock_balances WHERE business_id=$1 AND on_hand<0 LIMIT 1',
            [b],
          )
        ).rowCount
      )
        throw new ConflictException();
      const updated = await ctx.tx.query(
        'UPDATE inventory_policies SET allow_negative=$1,version=version+1 WHERE business_id=$2 AND version=$3 RETURNING version',
        [input.allowNegative, b, input.version],
      );
      if (!updated.rowCount) throw new ConflictException();
      await audit(ctx, b, 'inventory.policy.updated', null, input);
      return { allowNegative: input.allowNegative, version: updated.rows[0]?.version };
    });
  }
}
