import type { createPricingClient } from './pricing.js';
type Data = Awaited<ReturnType<ReturnType<typeof createPricingClient>['load']>>;
/** Display only: authoritative price/stock calculations remain on the server. */
export function variantUnitSummary(data: Data, id: string): string[] {
  const variant = data.variants.find((v) => v.id === id);
  if (!variant) return [];
  const unit = (id: string | null) => data.units.find((u) => u.id === (id ?? variant.baseUnitId));
  const base = unit(variant.baseUnitId);
  return [
    `Measurement: ${base?.dimension ?? 'Unknown'}. Base stock unit: ${base?.name ?? 'Unknown'}.`,
    `Purchase: ${unit(variant.purchaseUnitId)?.name ?? 'Unknown'} · Selling: ${unit(variant.saleUnitId)?.name ?? 'Unknown'} · Count: ${unit(variant.countUnitId)?.name ?? 'Unknown'}.`,
    ...data.conversions
      .filter((c) => c.variantId === id)
      .map(
        (c) =>
          `1 ${unit(c.unitId)?.name ?? 'Unknown unit'} = ${c.numerator} / ${c.denominator} ${base?.name ?? 'base units'}.`,
      ),
  ];
}
export function promotionState(p: Data['promotions'][number], now = Date.now()) {
  if (p.withdrawn) return 'Withdrawn';
  if (Date.parse(p.startsAt) > now) return 'Scheduled';
  if (p.endsAt && Date.parse(p.endsAt) <= now) return 'Expired';
  return 'Active';
}
