import { readPolicy } from '../settings/settings-store.js';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { decimal, decimalString } from '@inventory/domain';
import type { Cart, Checkout, SaleQuote } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { CustomerAccess } from '../customers/customer-access.js';
import { ReceivableCore } from '../customers/receivable-core.js';
import { CashCore } from '../payments/cash-core.js';
import { SalePricing } from './sale-pricing.js';
import { saleReceipt } from './sale.repository.js';
@Injectable()
export class CheckoutService {
  constructor(
    @Inject(CustomerAccess) private readonly customers: CustomerAccess,
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(SalePricing) private readonly pricing: SalePricing,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
    @Inject(ReceivableCore) private readonly receivables: ReceivableCore,
    @Inject(CashCore) private readonly cash: CashCore,
  ) {}
  preview(actor: Actor, b: string, input: Cart) {
    return this.scope.run(actor, b, 'sales.write', (ctx) => this.pricing.quote(ctx, input));
  }
  checkout(actor: Actor, b: string, input: Checkout) {
    return this.scope.run(actor, b, 'sales.write', async (ctx) => {
      await this.ledger.warehouse(ctx, input.warehouseId);
      return idempotent(ctx, 'sale.checkout', input.idempotencyKey, input, () =>
        this.complete(ctx, input),
      );
    });
  }
  async complete(ctx: OrganizationContext, input: Checkout, verifiedOfflineQuote?: SaleQuote) {
    const quote = verifiedOfflineQuote ?? (await this.pricing.quote(ctx, input));
    if (input.quoteFingerprint !== quote.quoteFingerprint) throw new ConflictException();
    const total = BigInt(quote.totalMinor),
      paid = BigInt(input.cashAppliedMinor),
      received = BigInt(input.cashReceivedMinor),
      remaining = total - paid;
    if (
      paid > total ||
      received < paid ||
      (paid === 0n && received !== 0n) ||
      (remaining > 0n && !input.customerId)
    )
      throw new ConflictException();
    const id = randomUUID(),
      b = ctx.business.id;
    await ctx.tx.query(
      'INSERT INTO sales(id,business_id,store_id,warehouse_id,customer_id,currency,net_minor,tax_minor,total_minor,cash_received_minor,change_minor,actor_id,receipt_footer) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
      [
        id,
        b,
        quote.storeId,
        quote.warehouseId,
        quote.customerId,
        quote.currency,
        quote.netMinor,
        quote.taxMinor,
        quote.totalMinor,
        input.cashReceivedMinor,
        (received - paid).toString(),
        ctx.actor.accountId,
        (await readPolicy(ctx.tx, b)).values.company?.receiptFooter ?? '',
      ],
    );
    for (const line of quote.lines) {
      const lineId = randomUUID();
      let movementId: string | null = null;
      if (line.trackInventory)
        movementId = (
          await this.ledger.apply(ctx, {
            variantId: line.variantId,
            warehouseId: quote.warehouseId,
            locationId: line.locationId,
            quantityDelta: decimalString(-decimal(line.baseQuantity)),
            type: 'sale',
            sourceKind: 'sale',
            sourceId: lineId,
            commandId: input.idempotencyKey,
            reason: `Sale ${id}`,
          })
        ).id;
      await ctx.tx.query(
        'INSERT INTO sale_lines(id,business_id,sale_id,variant_id,unit_id,location_id,name,sku,quantity,base_quantity,unit_price,price_id,promotion_id,discount_basis_points,tax_basis_points,tax_inclusive,net_minor,tax_minor,total_minor,track_inventory,movement_id,manual_discount_basis_points) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)',
        [
          lineId,
          b,
          id,
          line.variantId,
          line.unitId,
          line.locationId,
          line.name,
          line.sku,
          line.quantity,
          line.baseQuantity,
          line.unitPrice,
          line.priceId,
          line.promotionId,
          line.discountBasisPoints,
          line.taxBasisPoints,
          line.taxInclusive,
          line.netMinor,
          line.taxMinor,
          line.totalMinor,
          line.trackInventory,
          movementId,
          line.manualDiscountBasisPoints,
        ],
      );
    }
    if (input.exchangeReturnId) {
      const original = (
        await ctx.tx.query<{ warehouse_id: string; customer_id: string | null; currency: string }>(
          "SELECT s.warehouse_id,s.customer_id,s.currency FROM sale_returns r JOIN sales s ON s.business_id=r.business_id AND s.id=r.sale_id WHERE r.business_id=$1 AND r.id=$2 AND r.kind='exchange'",
          [b, input.exchangeReturnId],
        )
      ).rows[0];
      if (
        !original ||
        original.warehouse_id !== quote.warehouseId ||
        original.customer_id !== quote.customerId ||
        original.currency !== quote.currency
      )
        throw new ConflictException();
      await ctx.tx.query(
        'INSERT INTO sale_exchanges(business_id,return_id,replacement_sale_id) VALUES($1,$2,$3)',
        [b, input.exchangeReturnId, id],
      );
    }
    if (paid > 0n)
      await this.cash.record(ctx, {
        customerId: input.customerId,
        warehouseId: quote.warehouseId,
        saleId: id,
        currency: quote.currency,
        amountMinor: paid.toString(),
        reference: `Sale ${id}`,
      });
    if (remaining > 0n)
      await this.receivables.issue(ctx, {
        customerId: input.customerId!,
        storeId: quote.storeId,
        warehouseId: quote.warehouseId,
        saleId: id,
        currency: quote.currency,
        amountMinor: remaining.toString(),
        overrideReason: input.creditOverrideReason,
      });
    if (input.customerId) await this.customers.touch(ctx, input.customerId);
    await audit(ctx, id, 'sale.completed', null, {
      saleId: id,
      customerId: input.customerId,
      warehouseId: quote.warehouseId,
      storeId: quote.storeId,
      amount: quote.totalMinor,
      currency: quote.currency,
    });
    return saleReceipt(ctx, id);
  }
}
