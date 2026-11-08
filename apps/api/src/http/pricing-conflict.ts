import { ConflictException } from '@nestjs/common';
/** Only these public messages may pass through the safe error filter. No exception text leaks. */
export const pricingConflicts = {
  STOCK_UNAVAILABLE:
    'There is not enough available stock at the selected location, or some stock is reserved or damaged. Review the quantity and location before trying again.',
  CASH_SHIFT_REQUIRED:
    'Open a cash shift for your current warehouse and the sale currency before taking payment. Check that the terminal is active, then return to checkout.',
  QUOTE_CHANGED:
    'Prices or discounts changed while you were checking out. Refresh the cart totals and review the payment again. No sale was saved.',
  PAYMENT_ALLOCATION_INVALID:
    'Review the cash received and cash applied. Cash applied cannot exceed the total; any unpaid balance needs a customer account.',

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
