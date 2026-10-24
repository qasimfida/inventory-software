import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { decimal, baseQuantity } from '@inventory/domain';
import type { PurchaseReceive, SupplierInvoice } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { detail, purchase, line } from './purchase.repository.js';
@Injectable()
export class PurchaseReceiving {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
  ) {}
  receive(actor: Actor, b: string, id: string, input: PurchaseReceive) {
    return this.scope.run(actor, b, 'purchases.write', async (ctx) => {
      const order = await purchase(ctx, id);
      await this.ledger.warehouse(ctx, order.warehouseId);
      return idempotent(
        ctx,
        'purchase.receive',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (!['ordered', 'partially_received'].includes(order.state))
            throw new ConflictException();
          const item = await line(ctx, id, input.lineId);
          if (decimal(item.received) + decimal(input.quantity) > decimal(item.quantity))
            throw new ConflictException();
          if (
            decimal(input.damaged) > decimal(input.quantity) ||
            (decimal(input.damaged) > 0n && input.damageReason.length < 3)
          )
            throw new BadRequestException();
          const damage =
            decimal(input.damaged) > 0n
              ? receivedBaseQuantity(input.damaged, item.baseQuantity, item.quantity)
              : '0';
          const base = receivedBaseQuantity(input.quantity, item.baseQuantity, item.quantity),
            receiptId = randomUUID();
          const movement = await this.ledger.apply(ctx, {
            variantId: item.variantId,
            warehouseId: order.warehouseId,
            locationId: input.locationId,
            quantityDelta: base,
            damagedDelta: damage,
            type: 'purchase_receive',
            sourceKind: 'purchase_receipt',
            sourceId: receiptId,
            commandId: input.idempotencyKey,
            reason: `Purchase ${order.reference}`,
          });
          await ctx.tx.query(
            `INSERT INTO purchase_receipts(id,business_id,line_id,location_id,quantity,base_quantity,movement_id,actor_id,damaged,damage_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [
              receiptId,
              b,
              item.id,
              movement.locationId,
              input.quantity,
              base,
              movement.id,
              actor.accountId,
              input.damaged,
              input.damageReason,
            ],
          );
          await ctx.tx.query(
            'UPDATE purchase_lines SET received=received+$1 WHERE business_id=$2 AND id=$3',
            [input.quantity, b, item.id],
          );
          await ctx.tx.query(
            `UPDATE purchase_orders SET state=CASE WHEN EXISTS(SELECT 1 FROM purchase_lines WHERE business_id=$1 AND purchase_id=$2 AND received<quantity) THEN 'partially_received' ELSE 'completed' END,version=version+1 WHERE business_id=$1 AND id=$2`,
            [b, id],
          );
          return detail(ctx, id);
        },
      );
    });
  }
  invoice(actor: Actor, b: string, id: string, input: SupplierInvoice) {
    return this.scope.run(actor, b, 'purchases.write', async (ctx) => {
      const order = await purchase(ctx, id),
        wh = await this.ledger.warehouse(ctx, order.warehouseId);
      return idempotent(
        ctx,
        'purchase.invoice',
        input.idempotencyKey,
        { ...input, id },
        async () => {
          if (!['ordered', 'partially_received', 'completed'].includes(order.state))
            throw new ConflictException();
          const invoiceId = randomUUID();
          await ctx.tx.query(
            `INSERT INTO supplier_invoices(id,business_id,purchase_id,reference,amount_minor,due_date,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [invoiceId, b, id, input.reference, input.amountMinor, input.dueDate, actor.accountId],
          );
          await audit(ctx, invoiceId, 'purchase.invoice', null, {
            purchaseId: id,
            warehouseId: order.warehouseId,
            storeId: wh.storeId,
            amount: input.amountMinor,
            currency: order.currency,
          });
          return detail(ctx, id);
        },
      );
    });
  }
}

function receivedBaseQuantity(quantity: string, numerator: string, denominator: string) {
  try {
    return baseQuantity(quantity, numerator, denominator);
  } catch {
    throw new BadRequestException();
  }
}
