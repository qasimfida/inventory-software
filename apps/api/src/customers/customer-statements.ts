import { Inject, Injectable } from '@nestjs/common';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { CustomerAccess } from './customer-access.js';
import { remainingSql } from './receivable-core.js';
@Injectable()
export class CustomerStatements {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(CustomerAccess) private readonly customers: CustomerAccess,
  ) {}
  read(actor: Actor, b: string, id: string, offset: number) {
    return this.scope.run(actor, b, 'customers.read', async (ctx) => {
      const customer = await this.customers.get(ctx, id),
        args = [b, id, ctx.business.scope?.warehouseId ?? null],
        filter =
          'r.business_id=$1 AND r.customer_id=$2 AND ($3::uuid IS NULL OR r.warehouse_id=$3)';
      const outstanding = (
        await ctx.tx.query<{ amount: string }>(
          `SELECT COALESCE(sum(${remainingSql}),0)::text AS amount FROM customer_receivables r WHERE ${filter}`,
          args,
        )
      ).rows[0]!.amount;
      const receivables = (
        await ctx.tx.query<{
          id: string;
          saleId: string;
          warehouseId: string;
          amountMinor: string;
          outstandingMinor: string;
          dueDate: string;
          createdAt: Date;
        }>(
          `SELECT r.id,r.sale_id AS "saleId",r.warehouse_id AS "warehouseId",r.amount_minor::text AS "amountMinor",(${remainingSql})::text AS "outstandingMinor",r.due_date::text AS "dueDate",r.created_at AS "createdAt" FROM customer_receivables r WHERE ${filter} ORDER BY r.created_at DESC,r.id DESC LIMIT 26 OFFSET $4`,
          [...args, offset],
        )
      ).rows;
      const payments = (
        await ctx.tx.query<{ id: string; amountMinor: string; reference: string; createdAt: Date }>(
          `SELECT id,amount_minor::text AS "amountMinor",reference,created_at AS "createdAt" FROM cash_payments WHERE business_id=$1 AND customer_id=$2 AND ($3::uuid IS NULL OR warehouse_id=$3) ORDER BY created_at DESC,id DESC LIMIT 26 OFFSET $4`,
          [...args, offset],
        )
      ).rows;
      const credits = (
        await ctx.tx.query<{ id: string; sourceId: string; amountMinor: string; createdAt: Date }>(
          `SELECT c.id,c.source_id AS "sourceId",c.amount_minor::text AS "amountMinor",c.created_at AS "createdAt" FROM receivable_credits c JOIN customer_receivables r ON r.business_id=c.business_id AND r.id=c.receivable_id WHERE ${filter} ORDER BY c.created_at DESC,c.id DESC LIMIT 26 OFFSET $4`,
          [...args, offset],
        )
      ).rows;
      const refunds = (
        await ctx.tx.query<{ id: string; sourceId: string; amountMinor: string; createdAt: Date }>(
          `SELECT f.id,f.return_id AS "sourceId",f.amount_minor::text AS "amountMinor",f.created_at AS "createdAt" FROM cash_refunds f JOIN cash_payments p ON p.business_id=f.business_id AND p.id=f.payment_id WHERE p.business_id=$1 AND p.customer_id=$2 AND ($3::uuid IS NULL OR p.warehouse_id=$3) ORDER BY f.created_at DESC,f.id DESC LIMIT 26 OFFSET $4`,
          [...args, offset],
        )
      ).rows;
      return {
        refunds: refunds.slice(0, 25).map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        customerId: id,
        currency: customer.currency,
        outstandingMinor: outstanding,
        hasMore: Math.max(receivables.length, payments.length, credits.length, refunds.length) > 25,
        receivables: receivables
          .slice(0, 25)
          .map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        payments: payments
          .slice(0, 25)
          .map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
        credits: credits.slice(0, 25).map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      };
    });
  }
}
