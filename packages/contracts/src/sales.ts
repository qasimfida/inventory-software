import { z } from 'zod';
import { positiveQuantitySchema, operationKeySchema, currencySchema } from './conventions.js';
import { nonnegativeMinorSchema } from './customers.js';
export const cartLineSchema = z
  .object({
    variantId: z.uuid(),
    unitId: z.uuid(),
    quantity: positiveQuantitySchema,
    locationId: z.uuid().nullable().default(null),
    manualDiscountBasisPoints: z.number().int().min(0).max(10000).default(0),
  })
  .strict();
export const cartSchema = z
  .object({
    warehouseId: z.uuid(),
    customerId: z.uuid().nullable().default(null),
    lines: z.array(cartLineSchema).min(1).max(50),
  })
  .strict();
export const checkoutSchema = cartSchema.extend({
  exchangeReturnId: z.uuid().optional(),
  quoteFingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  cashAppliedMinor: nonnegativeMinorSchema,
  cashReceivedMinor: nonnegativeMinorSchema,
  creditOverrideReason: z.union([z.literal(''), z.string().trim().min(3).max(240)]).default(''),
  idempotencyKey: operationKeySchema,
});
export const saleQuoteLineSchema = cartLineSchema.extend({
  name: z.string(),
  sku: z.string(),
  baseQuantity: z.string(),
  unitPrice: z.string(),
  priceId: z.uuid(),
  promotionId: z.uuid().nullable(),
  discountBasisPoints: z.number().int(),
  taxBasisPoints: z.number().int(),
  taxInclusive: z.boolean(),
  netMinor: nonnegativeMinorSchema,
  taxMinor: nonnegativeMinorSchema,
  totalMinor: nonnegativeMinorSchema,
  trackInventory: z.boolean(),
  available: z.string(),
  currency: currencySchema,
});
export const saleQuoteSchema = z.object({
  warehouseId: z.uuid(),
  storeId: z.uuid(),
  customerId: z.uuid().nullable(),
  currency: currencySchema,
  netMinor: nonnegativeMinorSchema,
  taxMinor: nonnegativeMinorSchema,
  totalMinor: nonnegativeMinorSchema,
  quoteFingerprint: z.string(),
  lines: z.array(saleQuoteLineSchema),
});
export const saleSchema = z.object({
  id: z.uuid(),
  storeId: z.uuid(),
  warehouseId: z.uuid(),
  customerId: z.uuid().nullable(),
  currency: currencySchema,
  netMinor: nonnegativeMinorSchema,
  taxMinor: nonnegativeMinorSchema,
  totalMinor: nonnegativeMinorSchema,
  cashReceivedMinor: nonnegativeMinorSchema,
  changeMinor: nonnegativeMinorSchema,
  state: z.enum(['completed', 'partially_returned', 'returned', 'voided']),
  actorId: z.uuid(),
  createdAt: z.iso.datetime(),
});
export const saleReceiptSchema = z.object({
  sale: saleSchema,
  lines: z.array(
    saleQuoteLineSchema
      .omit({ available: true, currency: true })
      .extend({ id: z.uuid(), movementId: z.uuid().nullable() }),
  ),
  payments: z.array(z.object({ id: z.uuid(), amountMinor: z.string(), reference: z.string() })),
  receivableId: z.uuid().nullable(),
  finance: z.object({
    reconciled: z.boolean(),
    outstandingMinor: z.string(),
    dueDate: z.string().nullable(),
    returns: z.array(
      z.object({
        id: z.uuid(),
        kind: z.string(),
        reasonCode: z.string(),
        totalMinor: z.string(),
        creditMinor: z.string(),
        cashRefundMinor: z.string(),
        createdAt: z.string(),
        replacementSaleId: z.uuid().nullable(),
      }),
    ),
    refunds: z.array(
      z.object({ id: z.uuid(), returnId: z.uuid(), paymentId: z.uuid(), amountMinor: z.string() }),
    ),
    returnedLines: z.array(z.object({ saleLineId: z.uuid(), quantity: z.string() })),
  }),
});
export const saleQuerySchema = z
  .object({
    warehouseId: z.uuid(),
    search: z.string().trim().max(120).default(''),
    code: z.string().trim().toUpperCase().max(120).default(''),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const posItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      name: z.string(),
      sku: z.string(),
      unitId: z.uuid(),
      units: z.array(z.object({ id: z.uuid(), code: z.string() })),
    }),
  ),
  hasMore: z.boolean(),
  offset: z.number(),
});
export const salePageSchema = z.object({
  sales: z.array(saleSchema),
  hasMore: z.boolean(),
  offset: z.number(),
});
export type Cart = z.infer<typeof cartSchema>;
export type Checkout = z.infer<typeof checkoutSchema>;
export type SaleQuery = z.infer<typeof saleQuerySchema>;
export type Sale = z.infer<typeof saleSchema>;
export type SaleQuote = z.infer<typeof saleQuoteSchema>;
