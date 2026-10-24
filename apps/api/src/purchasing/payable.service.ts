import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PayableQuery, SupplierCredit, SupplierSettlement } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { requirePermission } from '../organization/access.js';
import { LocationAccess } from '../organization/location-access.js';
import { ShiftCore } from '../payments/shift-core.js';
import { idempotent } from '../database/idempotency.js';
import { payable, payableDetail, payableProjection, payableRows } from './payable.repository.js';

@Injectable()
export class PayableService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LocationAccess) private readonly locations: LocationAccess,
    @Inject(ShiftCore) private readonly shifts: ShiftCore,
  ) {}
  list(actor: Actor, b: string, query: PayableQuery) {
    return this.scope.run(actor, b, 'payments.read', async (ctx) => {
      requirePermission(ctx.business, 'purchases.read');
      await this.locations.warehouse(ctx, query.warehouseId);
      const filter =
        'FROM invoices WHERE "warehouseId"=$2 AND ($3::uuid IS NULL OR "supplierId"=$3)';
      const args = [b, query.warehouseId, query.supplierId ?? null];
      const rows = (
        await ctx.tx.query(
          `${payableRows} SELECT ${payableProjection} ${filter} ORDER BY "dueDate",id LIMIT 26 OFFSET $4`,
          [...args, query.offset],
        )
      ).rows;
      const totals = (
        await ctx.tx.query(
          `${payableRows} SELECT currency,sum(greatest(gross-credits-paid+refunded,0))::text AS "payableMinor",
        sum(greatest(credits+paid-refunded-gross,0))::text AS "supplierOwesMinor" ${filter} GROUP BY currency ORDER BY currency`,
          args,
        )
      ).rows;
      return {
        invoices: rows.slice(0, 25),
        offset: query.offset,
        hasMore: rows.length > 25,
        totals,
      };
    });
  }
  detail(actor: Actor, b: string, id: string, offset = 0) {
    return this.scope.run(actor, b, 'payments.read', async (ctx) => {
      requirePermission(ctx.business, 'purchases.read');
      const invoice = await payable(ctx, id);
      await this.locations.warehouse(ctx, invoice.warehouseId);
      return payableDetail(ctx, invoice, offset);
    });
  }
  settle(actor: Actor, b: string, id: string, input: SupplierSettlement) {
    return this.scope.run(actor, b, 'payments.write', async (ctx) => {
      requirePermission(ctx.business, 'payments.cash');
      requirePermission(ctx.business, 'purchases.read');
      const invoice = await payable(ctx, id);
      const wh = await this.locations.warehouse(ctx, invoice.warehouseId);
      return idempotent(
        ctx,
        'supplier.settle',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          const amount = BigInt(input.amountMinor);
          const due = BigInt(invoice.outstandingMinor);
          if (amount > (input.kind === 'payment' ? due : -due))
            throw new ConflictException('Amount exceeds the invoice balance.');
          const shiftId = await this.shifts.active(ctx, invoice.warehouseId, invoice.currency);
          const settlementId = randomUUID();
          await ctx.tx.query(
            `INSERT INTO supplier_settlements(id,business_id,invoice_id,shift_id,kind,amount_minor,reference,actor_id)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              settlementId,
              b,
              id,
              shiftId,
              input.kind,
              input.amountMinor,
              input.reference,
              actor.accountId,
            ],
          );
          await this.shifts.entry(
            ctx,
            shiftId,
            input.kind === 'payment' ? -amount : amount,
            input.kind === 'payment' ? 'cash_out' : 'cash_in',
            settlementId,
            input.reference,
          );
          await audit(ctx, settlementId, `supplier.${input.kind}`, null, {
            sourceId: id,
            purchaseId: invoice.purchaseId,
            supplierId: invoice.supplierId,
            shiftId,
            warehouseId: wh.id,
            storeId: wh.storeId,
            amount: input.amountMinor,
            currency: invoice.currency,
          });
          return { id: settlementId };
        },
      );
    });
  }
  credit(actor: Actor, b: string, id: string, input: SupplierCredit) {
    return this.scope.run(actor, b, 'payments.write', async (ctx) => {
      requirePermission(ctx.business, 'purchases.write');
      const invoice = await payable(ctx, id);
      const wh = await this.locations.warehouse(ctx, invoice.warehouseId);
      return idempotent(
        ctx,
        'supplier.credit',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (BigInt(input.amountMinor) + BigInt(invoice.creditMinor) > BigInt(invoice.amountMinor))
            throw new ConflictException('Credits cannot exceed the original invoice.');
          const match = await ctx.tx.query(
            `SELECT 1 FROM purchase_returns r JOIN purchase_receipts p ON p.business_id=r.business_id AND p.id=r.receipt_id
           JOIN purchase_lines l ON l.business_id=p.business_id AND l.id=p.line_id
           WHERE r.business_id=$1 AND r.id=$2 AND l.purchase_id=$3`,
            [b, input.returnId, invoice.purchaseId],
          );
          if (!match.rowCount)
            throw new ConflictException('Return must belong to this invoice purchase.');
          const creditId = randomUUID();
          await ctx.tx.query(
            `INSERT INTO supplier_credits(id,business_id,invoice_id,return_id,amount_minor,reference,reason,actor_id)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              creditId,
              b,
              id,
              input.returnId,
              input.amountMinor,
              input.reference,
              input.reason,
              actor.accountId,
            ],
          );
          await audit(ctx, creditId, 'supplier.credit', null, {
            sourceId: id,
            purchaseId: invoice.purchaseId,
            supplierId: invoice.supplierId,
            warehouseId: wh.id,
            storeId: wh.storeId,
            amount: input.amountMinor,
            currency: invoice.currency,
          });
          return { id: creditId };
        },
      );
    });
  }
}
