import { ConflictException } from '@nestjs/common';
/** Only these public messages may pass through the safe error filter. No exception text leaks. */
export const pricingConflicts = {
  PRICE_UNAVAILABLE:
    'No active price is configured for this item and store. Ask a manager to set its price in Catalog & pricing, then refresh the cart.',
  CART_CURRENCY_MISMATCH:
    'The customer and all cart items must use the same currency. Review customer and product pricing.',
  CHECKOUT_STORE_REQUIRED:
    'This warehouse needs an active store before checkout. Ask an administrator to review its location settings.',
} as const;
export type PricingConflictCode = keyof typeof pricingConflicts;
export class PricingConflict extends ConflictException {
  constructor(public readonly publicCode: PricingConflictCode) {
    super(pricingConflicts[publicCode]);
  }
}
