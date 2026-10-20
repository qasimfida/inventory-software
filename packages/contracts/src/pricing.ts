import { z } from 'zod';
import { decimalSchema, positiveQuantitySchema, currencySchema } from './conventions.js';
const name = z.string().trim().min(1).max(120),
  code = z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9_.:/-]{0,63}$/);
export const unitInputSchema = z
  .object({ name, code, dimension: z.enum(['count', 'mass', 'volume', 'length']) })
  .strict();
export const unitSchema = unitInputSchema.extend({ id: z.uuid() });
const variantFields = {
  name,
  sku: code,
  attributes: z
    .record(z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{0,31}$/), z.string().trim().min(1).max(100))
    .refine((v) => Object.keys(v).length <= 10)
    .default({}),
  barcodes: z.array(code).max(20).default([]),
  baseUnitId: z.uuid(),
  purchaseUnitId: z.uuid().nullable().default(null),
  saleUnitId: z.uuid().nullable().default(null),
  countUnitId: z.uuid().nullable().default(null),
  cost: decimalSchema.nullable().default(null),
  costCurrency: currencySchema.default('USD'),
  state: z.enum(['active', 'inactive', 'archived']).default('active'),
};
export const variantInputSchema = z
  .object(variantFields)
  .strict()
  .refine((v) => new Set([v.sku, ...v.barcodes]).size === v.barcodes.length + 1, 'Duplicate codes');
export const variantEditSchema = z
  .object({ ...variantFields, version: z.number().int().positive() })
  .strict();
export const variantSchema = z.object({
  ...variantFields,
  id: z.uuid(),
  productId: z.uuid(),
  version: z.number().int().positive(),
  isDefault: z.boolean(),
});
export const conversionSchema = z
  .object({
    unitId: z.uuid(),
    numerator: positiveQuantitySchema,
    denominator: positiveQuantitySchema,
  })
  .strict();
const period = { startsAt: z.iso.datetime(), endsAt: z.iso.datetime().nullable().default(null) };
const validPeriod = (v: { startsAt: string; endsAt: string | null }) =>
  !v.endsAt || Date.parse(v.endsAt) > Date.parse(v.startsAt);
export const priceInputSchema = z
  .object({
    variantId: z.uuid(),
    storeId: z.uuid().nullable().default(null),
    customerId: z.uuid().nullable().default(null),
    unitPrice: decimalSchema,
    currency: currencySchema,
    taxBasisPoints: z.number().int().min(0).max(10000).default(0),
    taxInclusive: z.boolean().default(false),
    ...period,
  })
  .strict()
  .refine(validPeriod, 'Invalid effective period');
export const priceSchema = z.object({
  id: z.uuid(),
  variantId: z.uuid(),
  storeId: z.uuid().nullable(),
  customerId: z.uuid().nullable().default(null),
  unitPrice: decimalSchema,
  currency: currencySchema,
  taxBasisPoints: z.number().int(),
  taxInclusive: z.boolean(),
  ...period,
});
export const promotionInputSchema = z
  .object({
    name,
    variantId: z.uuid(),
    storeId: z.uuid().nullable().default(null),
    discountBasisPoints: z.number().int().min(1).max(10000),
    minimumQuantity: positiveQuantitySchema.default('1'),
    priority: z.number().int().min(0).max(1000).default(0),
    ...period,
  })
  .strict()
  .refine(validPeriod, 'Invalid effective period');
export const promotionSchema = z.object({
  withdrawn: z.boolean().default(false),
  id: z.uuid(),
  name,
  variantId: z.uuid(),
  storeId: z.uuid().nullable(),
  discountBasisPoints: z.number().int(),
  minimumQuantity: positiveQuantitySchema,
  priority: z.number().int(),
  ...period,
});
export const quoteInputSchema = z
  .object({
    variantId: z.uuid(),
    storeId: z.uuid(),
    unitId: z.uuid(),
    quantity: positiveQuantitySchema,
    customerId: z.uuid().nullable().default(null),
    manualDiscountBasisPoints: z.number().int().min(0).max(10000).default(0),
  })
  .strict();
export const quoteSchema = z.object({
  variantId: z.uuid(),
  priceId: z.uuid(),
  promotionId: z.uuid().nullable(),
  currency: currencySchema,
  baseQuantity: positiveQuantitySchema,
  unitPrice: decimalSchema,
  discountBasisPoints: z.number().int(),
  netMinor: z.string(),
  taxMinor: z.string(),
  totalMinor: z.string(),
  quotedAt: z.iso.datetime(),
});
export const pricingWorkspaceSchema = z.object({
  units: z.array(unitSchema),
  variants: z.array(variantSchema),
  prices: z.array(priceSchema),
  promotions: z.array(promotionSchema),
  conversions: z.array(conversionSchema.extend({ variantId: z.uuid() })),
});
export type VariantInput = z.infer<typeof variantInputSchema>;
export type VariantEdit = z.infer<typeof variantEditSchema>;
export type UnitInput = z.infer<typeof unitInputSchema>;
export type Conversion = z.infer<typeof conversionSchema>;
export type PriceInput = z.infer<typeof priceInputSchema>;
export type PromotionInput = z.infer<typeof promotionInputSchema>;
export type QuoteInput = z.infer<typeof quoteInputSchema>;
