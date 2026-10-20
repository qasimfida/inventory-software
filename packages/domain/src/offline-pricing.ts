import { baseQuantity, priceLine } from './pricing.js';
import { decimal } from './decimal.js';
import type { OfflineLease, OfflineSale, SaleQuote } from '@inventory/contracts';
// Shared deterministic preview; the server recomputes from its own stored lease snapshot.
export function offlineQuote(lease: OfflineLease, cart: OfflineSale['lines']): SaleQuote {
  const policy = lease.policy,
    totals = new Map<string, bigint>();
  const lines = cart.map((line) => {
    const item = lease.snapshot.items.find((i) => i.id === line.variantId),
      unit = item?.units.find((u) => u.id === line.unitId);
    if (
      !item ||
      !unit ||
      (line.locationId && line.locationId !== lease.warehouseId) ||
      decimal(line.quantity) > decimal(policy.maxLineQuantity) ||
      line.manualDiscountBasisPoints > policy.maxDiscountBasisPoints
    )
      throw new Error('Unsupported item, location, quantity or discount.');
    const base = baseQuantity(line.quantity, unit.numerator, unit.denominator),
      used = (totals.get(item.id) ?? 0n) + decimal(base);
    totals.set(item.id, used);
    if (item.trackInventory && policy.requireCachedStock && used > decimal(item.available))
      throw new Error('Cached stock limit exceeded.');
    const promo = item.promotions.find((p) => decimal(base) >= decimal(p.minimumQuantity)),
      discount = Math.max(promo?.discountBasisPoints ?? 0, line.manualDiscountBasisPoints);
    return {
      ...line,
      ...priceLine({
        quantity: base,
        unitPrice: item.unitPrice,
        currency: item.currency,
        discountBasisPoints: discount,
        taxBasisPoints: item.taxBasisPoints,
        taxInclusive: item.taxInclusive,
      }),
      name: item.name,
      sku: item.sku,
      baseQuantity: base,
      unitPrice: item.unitPrice,
      priceId: item.priceId,
      promotionId: promo && discount === promo.discountBasisPoints ? promo.id : null,
      discountBasisPoints: discount,
      taxBasisPoints: item.taxBasisPoints,
      taxInclusive: item.taxInclusive,
      locationId: lease.warehouseId,
      trackInventory: item.trackInventory,
      available: item.available,
      currency: item.currency,
    };
  });
  const net = lines.reduce((s, l) => s + BigInt(l.netMinor), 0n),
    tax = lines.reduce((s, l) => s + BigInt(l.taxMinor), 0n),
    total = net + tax;
  if (total > BigInt(policy.maxSaleMinor)) throw new Error('Offline sale limit exceeded.');
  return {
    warehouseId: lease.warehouseId,
    storeId: lease.snapshot.storeId,
    customerId: null,
    currency: lease.currency,
    lines,
    netMinor: net.toString(),
    taxMinor: tax.toString(),
    totalMinor: total.toString(),
    quoteFingerprint: '0'.repeat(64),
  };
}
