import { PricingConflict } from '../http/pricing-conflict.js';
import { BadRequestException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { canonicalJson } from '@inventory/domain';
import { hasPermission, currencySchema } from '@inventory/contracts';
import type { Cart, SaleQuote } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { PricingService } from '../catalog/pricing.service.js';
import { LedgerCore } from '../inventory/ledger-core.js';
import { CustomerAccess } from '../customers/customer-access.js';
@Injectable()
export class SalePricing {
  constructor(
    @Inject(PricingService) private readonly pricing: PricingService,
    @Inject(LedgerCore) private readonly ledger: LedgerCore,
    @Inject(CustomerAccess) private readonly customers: CustomerAccess,
  ) {}
  async quote(ctx: OrganizationContext, input: Cart): Promise<SaleQuote> {
    const wh = await this.ledger.warehouse(ctx, input.warehouseId);
    if (!wh.storeId) throw new PricingConflict('CHECKOUT_STORE_REQUIRED');
    if (input.customerId) {
      if (!hasPermission(ctx.business, 'customers.read')) throw new ForbiddenException();
      await this.customers.active(ctx, input.customerId, wh.storeId);
    }
    const lines: SaleQuote['lines'] = [];
    for (const item of input.lines) {
      const active = await this.ledger.catalog.active(ctx, item.variantId),
        locationId = item.locationId ?? wh.id;
      if (locationId !== wh.id) await this.ledger.location(ctx, wh.id, locationId);
      const quote = await this.pricing.quoteInTransaction(ctx, {
        variantId: item.variantId,
        unitId: item.unitId,
        quantity: item.quantity,
        storeId: wh.storeId,
        customerId: input.customerId,
        manualDiscountBasisPoints: item.manualDiscountBasisPoints,
      });
      const balance = (
        await ctx.tx.query<{ available: string }>(
          'SELECT (on_hand-reserved-damaged)::text AS available FROM stock_balances WHERE business_id=$1 AND warehouse_id=$2 AND location_id=$3 AND variant_id=$4',
          [ctx.business.id, wh.id, locationId, item.variantId],
        )
      ).rows[0];
      lines.push({
        ...item,
        ...{
          baseQuantity: quote.baseQuantity,
          unitPrice: quote.unitPrice,
          priceId: quote.priceId,
          promotionId: quote.promotionId,
          discountBasisPoints: quote.discountBasisPoints,
          taxBasisPoints: quote.taxBasisPoints,
          taxInclusive: quote.taxInclusive,
          netMinor: quote.netMinor,
          taxMinor: quote.taxMinor,
          totalMinor: quote.totalMinor,
        },
        currency: currencySchema.parse(quote.currency),
        locationId,
        name: active.variant.name,
        sku: active.variant.sku,
        trackInventory: active.product.trackInventory,
        available: balance?.available ?? '0',
      });
    }
    const currency = lines[0]!.currency;
    if (input.customerId && (await this.customers.get(ctx, input.customerId)).currency !== currency)
      throw new PricingConflict('CART_CURRENCY_MISMATCH');
    if (lines.some((l) => l.currency !== currency))
      throw new PricingConflict('CART_CURRENCY_MISMATCH');
    const net = lines.reduce((n, l) => n + BigInt(l.netMinor), 0n),
      tax = lines.reduce((n, l) => n + BigInt(l.taxMinor), 0n);
    if (net + tax > 999999999999999999999999n) throw new BadRequestException();
    const fingerprint = {
      warehouseId: wh.id,
      customerId: input.customerId,
      lines: lines.map((l) => ({
        variantId: l.variantId,
        unitId: l.unitId,
        quantity: l.quantity,
        locationId: l.locationId,
        priceId: l.priceId,
        promotionId: l.promotionId,
        totalMinor: l.totalMinor,
        taxMinor: l.taxMinor,
        discount: l.discountBasisPoints,
        currency: l.currency,
      })),
    };
    return {
      warehouseId: wh.id,
      storeId: wh.storeId,
      customerId: input.customerId,
      currency,
      netMinor: net.toString(),
      taxMinor: tax.toString(),
      totalMinor: (net + tax).toString(),
      lines,
      quoteFingerprint: createHash('sha256').update(canonicalJson(fingerprint)).digest('hex'),
    };
  }
}
