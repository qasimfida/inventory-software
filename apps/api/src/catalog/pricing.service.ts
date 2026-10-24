import { PricingConflict } from '../http/pricing-conflict.js';
import { CustomerAccess } from '../customers/customer-access.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { hasPermission } from '@inventory/contracts';
import type { PriceInput, PromotionInput, QuoteInput } from '@inventory/contracts';
import { baseQuantity, decimal, priceLine } from '@inventory/domain';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor, OrganizationContext } from '../organization/organization.scope.js';
import { LocationAccess } from '../organization/location-access.js';
import { getProduct, requireBusinessScope } from './catalog.repository.js';
import { activeVariant, conversion } from './variant.repository.js';
import { pricingWorkspace, priceProjection, promotionProjection } from './pricing.repository.js';
@Injectable()
export class PricingService {
  constructor(
    @Inject(CustomerAccess) private readonly customers: CustomerAccess,
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LocationAccess) private readonly locations: LocationAccess,
  ) {}
  workspace(actor: Actor, b: string, productId: string) {
    return this.scope.run(actor, b, 'products.read', async (ctx) => {
      await getProduct(ctx, productId);
      return pricingWorkspace(ctx, productId);
    });
  }
  private async scopeForPrice(ctx: OrganizationContext, storeId: string | null) {
    if (!storeId) {
      requireBusinessScope(ctx);
      return;
    }
    if (ctx.business.scope?.warehouseId) throw new ForbiddenException();
    const store = await this.locations.store(ctx, storeId);
    if (store.state !== 'active') throw new ConflictException();
  }
  price(actor: Actor, b: string, input: PriceInput) {
    return this.scope.run(actor, b, 'products.write', async (ctx) => {
      await this.scopeForPrice(ctx, input.storeId);
      if (input.customerId) {
        if (!hasPermission(ctx.business, 'customers.read')) throw new ForbiddenException();
        if (!input.storeId) throw new BadRequestException();
        await this.customers.active(ctx, input.customerId, input.storeId);
      }
      await activeVariant(ctx, input.variantId);
      const id = randomUUID();
      const duplicate = await ctx.tx.query(
        'SELECT 1 FROM price_entries WHERE business_id=$1 AND variant_id=$2 AND store_id IS NOT DISTINCT FROM $3::uuid AND starts_at=$4 AND customer_id IS NOT DISTINCT FROM $5::uuid',
        [b, input.variantId, input.storeId, input.startsAt, input.customerId],
      );
      if (duplicate.rowCount) throw new ConflictException();
      await ctx.tx.query(
        `INSERT INTO price_entries(id,business_id,variant_id,store_id,unit_price,currency,tax_basis_points,tax_inclusive,starts_at,ends_at,customer_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          id,
          b,
          input.variantId,
          input.storeId,
          input.unitPrice,
          input.currency,
          input.taxBasisPoints,
          input.taxInclusive,
          input.startsAt,
          input.endsAt,
          input.customerId,
        ],
      );
      await audit(ctx, id, 'price.created', null, input);
      return { ...input, id };
    });
  }
  promotion(actor: Actor, b: string, input: PromotionInput) {
    return this.scope.run(actor, b, 'products.write', async (ctx) => {
      await this.scopeForPrice(ctx, input.storeId);
      await activeVariant(ctx, input.variantId);
      const id = randomUUID();
      await ctx.tx.query(
        `INSERT INTO price_promotions(id,business_id,variant_id,store_id,name,discount_basis_points,minimum_quantity,priority,starts_at,ends_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          id,
          b,
          input.variantId,
          input.storeId,
          input.name,
          input.discountBasisPoints,
          input.minimumQuantity,
          input.priority,
          input.startsAt,
          input.endsAt,
        ],
      );
      await audit(ctx, id, 'promotion.created', null, input);
      return { ...input, id };
    });
  }
  withdraw(actor: Actor, b: string, id: string) {
    return this.scope.run(actor, b, 'products.write', async (ctx) => {
      const promotion = (
        await ctx.tx.query<{ storeId: string | null }>(
          'SELECT store_id AS "storeId" FROM price_promotions WHERE business_id=$1 AND id=$2',
          [b, id],
        )
      ).rows[0];
      if (!promotion) throw new ConflictException();
      await this.scopeForPrice(ctx, promotion.storeId);
      const inserted = await ctx.tx.query(
        'INSERT INTO promotion_withdrawals(business_id,promotion_id,actor_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [b, id, actor.accountId],
      );
      if (inserted.rowCount)
        await audit(ctx, id, 'promotion.withdrawn', null, { storeId: promotion.storeId });
      return { ok: true };
    });
  }
  quote(actor: Actor, b: string, input: QuoteInput) {
    return this.scope.run(actor, b, 'products.read', (ctx) => this.quoteInTransaction(ctx, input));
  }
  async quoteInTransaction(ctx: OrganizationContext, input: QuoteInput) {
    const store = await this.locations.store(ctx, input.storeId);
    if (store.state !== 'active') throw new ConflictException();
    await activeVariant(ctx, input.variantId);
    if (input.customerId) {
      if (!hasPermission(ctx.business, 'customers.read')) throw new ForbiddenException();
      await this.customers.active(ctx, input.customerId, input.storeId);
    }
    if (input.manualDiscountBasisPoints && !hasPermission(ctx.business, 'products.write'))
      throw new ForbiddenException();
    if (input.manualDiscountBasisPoints) await this.scopeForPrice(ctx, input.storeId);
    const factor = await conversion(ctx, input.variantId, input.unitId);
    let quantity: string;
    try {
      quantity = baseQuantity(input.quantity, factor.numerator, factor.denominator);
    } catch {
      throw new BadRequestException();
    }
    const now = new Date();
    const args = [ctx.business.id, input.variantId, input.storeId, now];
    const price = (
      await ctx.tx.query<{
        id: string;
        unitPrice: string;
        currency: string;
        taxBasisPoints: number;
        taxInclusive: boolean;
        startsAt: Date;
        endsAt: Date | null;
      }>(
        `SELECT ${priceProjection} FROM price_entries WHERE business_id=$1 AND variant_id=$2 AND (store_id IS NULL OR store_id=$3) AND starts_at<=$4 AND (ends_at IS NULL OR ends_at>$4) AND (customer_id IS NULL OR customer_id=$5) ORDER BY (customer_id IS NOT NULL) DESC,(store_id IS NOT NULL) DESC,starts_at DESC,id DESC LIMIT 1`,
        [...args, input.customerId],
      )
    ).rows[0];
    if (!price) throw new PricingConflict('PRICE_UNAVAILABLE');
    const candidates = (
      await ctx.tx.query<{
        id: string;
        discountBasisPoints: number;
        minimumQuantity: string;
        startsAt: Date;
        endsAt: Date | null;
      }>(
        `SELECT ${promotionProjection} FROM price_promotions WHERE business_id=$1 AND variant_id=$2 AND (store_id IS NULL OR store_id=$3) AND starts_at<=$4 AND (ends_at IS NULL OR ends_at>$4) AND NOT EXISTS(SELECT 1 FROM promotion_withdrawals w WHERE w.business_id=price_promotions.business_id AND w.promotion_id=price_promotions.id AND w.created_at<=$4) ORDER BY priority DESC,(store_id IS NOT NULL) DESC,id`,
        args,
      )
    ).rows;
    const promotion = candidates.find((p) => decimal(quantity) >= decimal(p.minimumQuantity));
    // Promotions never stack. A permitted manual discount replaces the selected promotion only if larger.
    const discount = Math.max(promotion?.discountBasisPoints ?? 0, input.manualDiscountBasisPoints);
    let amounts: ReturnType<typeof priceLine>;
    try {
      amounts = priceLine({
        quantity,
        unitPrice: price.unitPrice,
        currency: price.currency,
        discountBasisPoints: discount,
        taxBasisPoints: price.taxBasisPoints,
        taxInclusive: price.taxInclusive,
      });
    } catch {
      throw new BadRequestException();
    }
    return {
      variantId: input.variantId,
      priceId: price.id,
      promotionId: promotion && discount === promotion.discountBasisPoints ? promotion.id : null,
      currency: price.currency,
      baseQuantity: quantity,
      unitPrice: price.unitPrice,
      discountBasisPoints: discount,
      taxBasisPoints: price.taxBasisPoints,
      taxInclusive: price.taxInclusive,
      ...amounts,
      quotedAt: now.toISOString(),
    };
  }
}
