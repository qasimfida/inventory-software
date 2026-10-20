import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SaleReturn } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LocationAccess } from '../organization/location-access.js';
import { idempotent } from '../database/idempotency.js';
import { CustomerAccess } from '../customers/customer-access.js';
import { ReceivableCore } from '../customers/receivable-core.js';
import { CashRefunds } from '../payments/cash-refunds.js';
import { getSale } from './sale.repository.js';
import { ReturnLines } from './return-lines.js';
@Injectable()
export class SaleReturns {
  constructor(
    @Inject(CustomerAccess) private readonly customers: CustomerAccess,
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LocationAccess) private readonly locations: LocationAccess,
    @Inject(ReceivableCore) private readonly credit: ReceivableCore,
    @Inject(CashRefunds) private readonly cash: CashRefunds,
    @Inject(ReturnLines) private readonly lines: ReturnLines,
  ) {}
  record(actor: Actor, b: string, saleId: string, input: SaleReturn) {
    return this.scope.run(
      actor,
      b,
      input.kind === 'void' ? 'sales.void' : 'sales.refund',
      async (ctx) => {
        const sale = await getSale(ctx, saleId);
        await this.locations.warehouse(ctx, sale.warehouseId);
        return idempotent(
          ctx,
          'sale.return',
          input.idempotencyKey,
          { ...input, saleId },
          async () => {
            if (sale.state === 'voided' || sale.state === 'returned') throw new ConflictException();
            const plan = await this.lines.plan(ctx, saleId, input),
              id = randomUUID(),
              total = plan.net + plan.tax;
            const receivable = (
              await ctx.tx.query<{ id: string }>(
                'SELECT id FROM customer_receivables WHERE business_id=$1 AND sale_id=$2',
                [b, saleId],
              )
            ).rows[0];
            const outstanding = receivable
                ? BigInt((await this.credit.get(ctx, receivable.id)).outstandingMinor)
                : 0n,
              credit = outstanding < total ? outstanding : total;
            await ctx.tx.query(
              'INSERT INTO sale_returns(id,business_id,sale_id,kind,reason_code,note,net_minor,tax_minor,total_minor,credit_minor,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
              [
                id,
                b,
                saleId,
                input.kind,
                input.reasonCode,
                input.note,
                plan.net.toString(),
                plan.tax.toString(),
                total.toString(),
                credit.toString(),
                actor.accountId,
              ],
            );
            if (credit > 0n) await this.credit.credit(ctx, receivable!.id, id, credit.toString());
            if (total > credit)
              await this.cash.record(
                ctx,
                saleId,
                id,
                sale.warehouseId,
                sale.currency,
                total - credit,
              );
            await this.lines.apply(ctx, id, sale.warehouseId, plan, input);
            await ctx.tx.query('UPDATE sales SET state=$3 WHERE business_id=$1 AND id=$2', [
              b,
              saleId,
              input.kind === 'void'
                ? 'voided'
                : plan.allReturned
                  ? 'returned'
                  : 'partially_returned',
            ]);
            if (sale.customerId) await this.customers.touch(ctx, sale.customerId);
            await audit(ctx, id, `sale.${input.kind}`, null, {
              saleId,
              warehouseId: sale.warehouseId,
              storeId: sale.storeId,
              amount: total.toString(),
              currency: sale.currency,
            });
            return {
              id,
              totalMinor: total.toString(),
              creditMinor: credit.toString(),
              cashRefundMinor: (total - credit).toString(),
            };
          },
        );
      },
    );
  }
}
