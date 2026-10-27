import { readPolicy } from '../settings/settings-store.js';
import { HttpException } from '@nestjs/common';
import {
  evaluateStorefrontReadiness,
  publicProductSchema,
  listingInputSchema,
  onlineOverridesSchema,
} from '@inventory/contracts';
import type {
  StorefrontSettings,
  OnlineStoreSettings,
  ReadinessVariant,
  ReadinessInput,
} from '@inventory/contracts';
import { decimal, decimalString, sellableStock, toMinorUnits } from '@inventory/domain';
import type { PricingService } from '../catalog/pricing.service.js';
import type { OrganizationContext } from '../organization/organization.scope.js';
export async function evaluateListing(
  ctx: OrganizationContext,
  config: StorefrontSettings,
  management: OnlineStoreSettings | null,
  row: Record<string, unknown>,
  pricing: PricingService,
  origins: readonly string[],
) {
  const input = listingInputSchema.parse({
    ...(row.overrides as object),
    productId: row.product_id,
    version: row.version,
  });
  const overrides = onlineOverridesSchema.parse(row.online_overrides);
  const product = (
    await ctx.tx.query(
      'SELECT p.*,c.state AS category_state FROM catalog_products p LEFT JOIN catalog_categories c ON c.business_id=p.business_id AND c.id=p.category_id WHERE p.business_id=$1 AND p.id=$2',
      [ctx.business.id, row.product_id],
    )
  ).rows[0];
  const variants = (
    await ctx.tx.query(
      'SELECT v.*,u.code FROM catalog_variants v LEFT JOIN catalog_units u ON u.business_id=v.business_id AND u.id=v.base_unit_id WHERE v.business_id=$1 AND v.product_id=$2 AND ($3::uuid IS NULL OR v.id=$3) ORDER BY v.id',
      [ctx.business.id, row.product_id, row.variant_id],
    )
  ).rows;
  const publicVariants: Array<{
    id: string;
    name: string;
    sku: string;
    unit: string;
    currency: string;
    totalMinor: string;
    taxMinor: string;
  }> = [];
  const checks: ReadinessVariant[] = [];
  for (const v of variants) {
    const check: ReadinessVariant = {
      id: v.id,
      sku: v.sku ?? '',
      unit: v.code ?? '',
      complete: v.state === 'active',
      priceMinor: null,
      currency: null,
    };
    try {
      const quoteInput = {
        variantId: v.id,
        unitId: v.base_unit_id,
        storeId: config.storeId,
        customerId: null,
        quantity: '1',
        manualDiscountBasisPoints: 0,
      };
      const pos = await pricing.quoteInTransaction(ctx, quoteInput);
      const price = overrides.price
        ? await pricing.quoteInTransaction(ctx, quoteInput, overrides.price)
        : pos;
      check.priceMinor = price.totalMinor;
      check.currency = price.currency;
      if (overrides.price) check.posPriceMinor = pos.totalMinor;
      if (v.cost !== null && v.cost_currency === price.currency)
        check.costMinor = toMinorUnits(v.cost, price.currency);
      publicVariants.push({
        id: v.id,
        name: v.name,
        sku: v.sku,
        unit: v.code,
        currency: price.currency,
        totalMinor: price.totalMinor,
        taxMinor: price.taxMinor,
      });
    } catch (error) {
      if (!(error instanceof HttpException && error.getStatus() < 500)) throw error;
    }
    checks.push(check);
  }
  const stock = (
    await ctx.tx.query<{ on_hand: string; reserved: string; damaged: string; records: string }>(
      `SELECT COALESCE(sum(b.on_hand),0)::text AS on_hand,COALESCE(sum(b.reserved),0)::text AS reserved,COALESCE(sum(b.damaged),0)::text AS damaged,count(*)::text AS records
    FROM stock_balances b JOIN warehouses w ON w.business_id=b.business_id AND w.id=b.warehouse_id
    WHERE b.business_id=$1 AND w.store_id=$2 AND w.state='active' AND ($4::uuid[] IS NULL OR w.id=ANY($4))
    AND b.variant_id IN(SELECT id FROM catalog_variants WHERE business_id=$1 AND product_id=$3 AND ($5::uuid IS NULL OR id=$5)) GROUP BY b.variant_id`,
      [
        ctx.business.id,
        config.storeId,
        row.product_id,
        management?.stockSources ?? null,
        row.variant_id,
      ],
    )
  ).rows;
  const quantities = stock.map((pool) =>
    decimal(
      sellableStock(pool.on_hand, pool.reserved, pool.damaged, management?.safetyBuffer ?? '0'),
    ),
  );
  const title = overrides.title ?? (input.title || String(product?.name ?? ''));
  const description =
    overrides.description ?? (input.description || String(product?.description ?? ''));
  const images: string[] =
    overrides.images ?? (input.images.length ? input.images : (product?.images ?? []));
  const threshold =
    (await readPolicy(ctx.tx, ctx.business.id)).values.industry?.lowStockThreshold ?? '5';
  const source: ReadinessInput = {
    exists: !!product,
    state: product?.state ?? '',
    title,
    description,
    images,
    allowedHosts: management?.allowedImageHosts ?? origins.map((o) => new URL(o).hostname),
    category: product?.category_state === 'active',
    currency: config.currency,
    variants: checks,
    hasStockSource: stock.length > 0,
    soldOut: !!product?.track_inventory && !quantities.some((q) => q > 0n),
    lowStock:
      !!product?.track_inventory && quantities.some((q) => q > 0n && q <= decimal(threshold)),
  };
  const result = evaluateStorefrontReadiness(source);
  return {
    source,
    quantity: decimalString(quantities.reduce((sum, q) => sum + q, 0n)),
    productImages: (product?.images ?? []) as string[],
    result,
    projection: result.ready
      ? publicProductSchema.parse({
          id: row.id,
          title,
          description,
          images,
          availability: result.availability === 'SOLD_OUT' ? 'sold_out' : 'in_stock',
          variants: publicVariants,
        })
      : null,
  };
}
