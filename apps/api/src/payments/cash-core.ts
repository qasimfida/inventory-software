import { Inject, Injectable, ForbiddenException, ConflictException } from '@nestjs/common';
import { ShiftCore } from './shift-core.js';
import { randomUUID } from 'node:crypto';
import { hasPermission } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { audit } from '../organization/organization.scope.js';
@Injectable()
export class CashCore {
  constructor(@Inject(ShiftCore) private readonly shifts: ShiftCore) {}
  async record(
    ctx: OrganizationContext,
    input: {
      customerId: string | null;
      warehouseId: string;
      saleId: string | null;
      currency: string;
      amountMinor: string;
      reference: string;
    },
  ) {
    if (!hasPermission(ctx.business, 'payments.write')) throw new ForbiddenException();
    if (BigInt(input.amountMinor) <= 0n) throw new ConflictException();
    const id = randomUUID(),
      shiftId = await this.shifts.active(ctx, input.warehouseId, input.currency);
    await ctx.tx.query(
      'INSERT INTO cash_payments(id,business_id,customer_id,warehouse_id,sale_id,currency,amount_minor,reference,actor_id,shift_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [
        id,
        ctx.business.id,
        input.customerId,
        input.warehouseId,
        input.saleId,
        input.currency,
        input.amountMinor,
        input.reference,
        ctx.actor.accountId,
        shiftId,
      ],
    );
    await this.shifts.entry(
      ctx,
      shiftId,
      BigInt(input.amountMinor),
      'payment',
      id,
      input.reference,
    );
    const wh = (
      await ctx.tx.query<{ store_id: string }>(
        'SELECT store_id FROM warehouses WHERE business_id=$1 AND id=$2',
        [ctx.business.id, input.warehouseId],
      )
    ).rows[0];
    if (!wh) throw new ConflictException();
    await audit(ctx, id, 'payment.cash-recorded', null, {
      paymentId: id,
      saleId: input.saleId,
      customerId: input.customerId,
      warehouseId: input.warehouseId,
      storeId: wh.store_id,
      amount: input.amountMinor,
      currency: input.currency,
    });
    return id;
  }
}
