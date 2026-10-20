import { LocationAccess } from '../organization/location-access.js';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { hasPermission } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { audit } from '../organization/organization.scope.js';
import { CustomerAccess } from './customer-access.js';
export const remainingSql = `r.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM receivable_allocations a WHERE a.business_id=r.business_id AND a.receivable_id=r.id),0)-COALESCE((SELECT sum(c.amount_minor) FROM receivable_credits c WHERE c.business_id=r.business_id AND c.receivable_id=r.id),0)`;
@Injectable()
export class ReceivableCore {
  constructor(
    @Inject(CustomerAccess) private readonly customers: CustomerAccess,
    @Inject(LocationAccess) private readonly locations: LocationAccess,
  ) {}
  async exposure(ctx: OrganizationContext, customerId: string) {
    return BigInt(
      (
        await ctx.tx.query<{ amount: string }>(
          `SELECT COALESCE(sum(${remainingSql}),0)::text AS amount FROM customer_receivables r WHERE r.business_id=$1 AND r.customer_id=$2`,
          [ctx.business.id, customerId],
        )
      ).rows[0]!.amount,
    );
  }
  async issue(
    ctx: OrganizationContext,
    input: {
      customerId: string;
      storeId: string;
      warehouseId: string;
      saleId: string;
      currency: string;
      amountMinor: string;
      overrideReason: string;
    },
  ) {
    const wh = await this.locations.warehouse(ctx, input.warehouseId);
    if (wh.storeId !== input.storeId || wh.state !== 'active') throw new ConflictException();
    const customer = await this.customers.active(ctx, input.customerId, input.storeId),
      amount = BigInt(input.amountMinor);
    if (amount <= 0n || customer.currency !== input.currency) throw new ConflictException();
    const override = input.overrideReason.length > 0;
    if (override && !hasPermission(ctx.business, 'customers.override'))
      throw new ForbiddenException();
    const nextExposure = (await this.exposure(ctx, customer.id)) + amount;
    if (nextExposure > 999999999999999999999999n) throw new ConflictException();
    const blocked =
      !customer.creditEnabled ||
      customer.creditHold ||
      nextExposure > BigInt(customer.creditLimitMinor);
    if (blocked && !override) throw new ConflictException();
    const id = randomUUID();
    await ctx.tx.query(
      `INSERT INTO customer_receivables(id,business_id,customer_id,warehouse_id,sale_id,currency,amount_minor,due_date,actor_id,override_reason) VALUES($1,$2,$3,$4,$5,$6,$7,(CURRENT_TIMESTAMP AT TIME ZONE $8)::date+$9::integer,$10,$11)`,
      [
        id,
        ctx.business.id,
        customer.id,
        input.warehouseId,
        input.saleId,
        input.currency,
        input.amountMinor,
        ctx.business.timeZone,
        customer.termsDays,
        ctx.actor.accountId,
        input.overrideReason,
      ],
    );
    await ctx.tx.query(
      'UPDATE customers SET last_activity_at=now() WHERE business_id=$1 AND id=$2',
      [ctx.business.id, customer.id],
    );
    await audit(ctx, id, override ? 'credit.override' : 'credit.issued', null, {
      customerId: customer.id,
      saleId: input.saleId,
      warehouseId: input.warehouseId,
      storeId: input.storeId,
      amount: input.amountMinor,
    });
    return id;
  }
  async get(ctx: OrganizationContext, id: string) {
    const row = (
      await ctx.tx.query<{
        id: string;
        customerId: string;
        warehouseId: string;
        saleId: string;
        currency: string;
        outstandingMinor: string;
      }>(
        `SELECT r.id,r.customer_id AS "customerId",r.warehouse_id AS "warehouseId",r.sale_id AS "saleId",r.currency,(${remainingSql})::text AS "outstandingMinor" FROM customer_receivables r WHERE r.business_id=$1 AND r.id=$2`,
        [ctx.business.id, id],
      )
    ).rows[0];
    if (!row) throw new NotFoundException();
    await this.customers.get(ctx, row.customerId);
    if (ctx.business.scope?.warehouseId && ctx.business.scope.warehouseId !== row.warehouseId)
      throw new NotFoundException();
    return row;
  }
  async allocate(ctx: OrganizationContext, id: string, paymentId: string, amountMinor: string) {
    const receipt = await this.get(ctx, id),
      amount = BigInt(amountMinor);
    if (amount <= 0n || amount > BigInt(receipt.outstandingMinor)) throw new ConflictException();
    const payment = (
      await ctx.tx.query<{ amount: string }>(
        `SELECT (p.amount_minor-COALESCE((SELECT sum(a.amount_minor) FROM receivable_allocations a WHERE a.business_id=p.business_id AND a.payment_id=p.id),0))::text AS amount FROM cash_payments p WHERE p.business_id=$1 AND p.id=$2 AND p.customer_id=$3 AND p.currency=$4 AND p.warehouse_id=$5`,
        [ctx.business.id, paymentId, receipt.customerId, receipt.currency, receipt.warehouseId],
      )
    ).rows[0];
    if (!payment || BigInt(payment.amount) < amount) throw new ConflictException();
    await ctx.tx.query(
      'INSERT INTO receivable_allocations(id,business_id,receivable_id,payment_id,amount_minor) VALUES($1,$2,$3,$4,$5)',
      [randomUUID(), ctx.business.id, id, paymentId, amountMinor],
    );
    return receipt;
  }
  async credit(ctx: OrganizationContext, id: string, sourceId: string, amountMinor: string) {
    const r = await this.get(ctx, id),
      amount = BigInt(amountMinor);
    if (amount <= 0n || amount > BigInt(r.outstandingMinor)) throw new ConflictException();
    await ctx.tx.query(
      'INSERT INTO receivable_credits(id,business_id,receivable_id,source_id,amount_minor,actor_id) VALUES($1,$2,$3,$4,$5,$6)',
      [randomUUID(), ctx.business.id, id, sourceId, amountMinor, ctx.actor.accountId],
    );
  }
}
