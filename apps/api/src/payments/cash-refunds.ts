import { ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { hasPermission } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { audit } from '../organization/organization.scope.js';
import { ShiftCore } from './shift-core.js';
@Injectable()
export class CashRefunds {
  constructor(@Inject(ShiftCore) private readonly shifts: ShiftCore) {}
  async record(
    ctx: OrganizationContext,
    saleId: string,
    returnId: string,
    warehouseId: string,
    currency: string,
    amount: bigint,
  ) {
    if (!hasPermission(ctx.business, 'sales.refund') && !hasPermission(ctx.business, 'sales.void'))
      throw new ForbiddenException();
    if (amount <= 0n) throw new ConflictException();
    const shiftId = await this.shifts.active(ctx, warehouseId, currency);
    const payments = (
      await ctx.tx.query<{ id: string; available: string }>(
        `SELECT p.id,(p.amount_minor-COALESCE((SELECT sum(r.amount_minor) FROM cash_refunds r WHERE r.business_id=p.business_id AND r.payment_id=p.id),0))::text AS available FROM cash_payments p WHERE p.business_id=$1 AND p.sale_id=$2 AND p.currency=$3 ORDER BY p.created_at,p.id`,
        [ctx.business.id, saleId, currency],
      )
    ).rows;
    let remaining = amount;
    for (const p of payments) {
      const take = BigInt(p.available) < remaining ? BigInt(p.available) : remaining;
      if (take <= 0n) continue;
      const id = randomUUID();
      await ctx.tx.query(
        'INSERT INTO cash_refunds(id,business_id,return_id,payment_id,shift_id,amount_minor,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [id, ctx.business.id, returnId, p.id, shiftId, take.toString(), ctx.actor.accountId],
      );
      await this.shifts.entry(ctx, shiftId, -take, 'refund', id, `Return ${returnId}`);
      await audit(ctx, id, 'payment.cash-refunded', null, {
        saleId,
        paymentId: p.id,
        shiftId,
        warehouseId,
        storeId: (await this.shifts.get(ctx, shiftId)).storeId,
        amount: take.toString(),
        currency,
      });
      remaining -= take;
    }
    if (remaining !== 0n) throw new ConflictException('Refund exceeds collected cash.');
  }
}
