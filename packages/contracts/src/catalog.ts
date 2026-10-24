import { z } from 'zod';
import { pageQuerySchema, currencySchema, decimalSchema } from './conventions.js';
const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9][A-Z0-9_.:/-]{0,63}$/);
export const catalogStateSchema = z.enum(['active', 'inactive', 'archived']);
const fields = {
  name: z.string().trim().min(1).max(120),
  sku: code,
  description: z.string().max(2000).default(''),
  images: z
    .array(
      z
        .url({ protocol: /^https$/ })
        .max(500)
        .refine((value) => !/^https:\/\/[^/]*@/.test(value)),
    )
    .max(5)
    .default([]),
  categoryId: z.uuid().nullable().default(null),
  barcodes: z.array(code).max(20).default([]),
  alternativeCodes: z.array(code).max(20).default([]),
  state: catalogStateSchema.default('active'),
  type: z.enum(['physical', 'service']).default('physical'),
  trackInventory: z.boolean().default(true),
};
function validProduct(v: {
  sku: string;
  barcodes: string[];
  alternativeCodes: string[];
  type: string;
  trackInventory: boolean;
}) {
  const codes = [v.sku, ...v.barcodes, ...v.alternativeCodes];
  return new Set(codes).size === codes.length && (v.type !== 'service' || !v.trackInventory);
}
export const createProductSchema = z
  .object(fields)
  .strict()
  .refine(validProduct, 'Codes must be unique; services cannot track stock');
export const editProductSchema = z
  .object({ ...fields, version: z.number().int().positive() })
  .strict()
  .refine(validProduct, 'Invalid product');
export const displayPriceSchema = z.object({
  unitPrice: decimalSchema,
  currency: currencySchema,
  unit: z.string(),
});
export const productSchema = z.object({
  ...fields,
  id: z.uuid(),
  version: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  price: displayPriceSchema.nullable().optional(),
});
export const categoryInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    parentId: z.uuid().nullable().default(null),
    state: catalogStateSchema.default('active'),
  })
  .strict();
export const categoryEditSchema = categoryInputSchema.extend({
  version: z.number().int().positive(),
});
export const categorySchema = categoryInputSchema.extend({
  id: z.uuid(),
  version: z.number().int().positive(),
});
export const catalogQuerySchema = pageQuerySchema.extend({
  storeId: z.uuid().optional(),
  state: catalogStateSchema.optional(),
  categoryId: z.uuid().optional(),
  type: z.enum(['physical', 'service']).optional(),
  code: code.optional(),
});
export const productPageSchema = z.object({
  items: z.array(productSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int(),
  offset: z.number().int(),
  hasMore: z.boolean(),
});
export const categoriesSchema = z.object({ items: z.array(categorySchema) });
export type Product = z.infer<typeof productSchema>;
export type ProductInput = z.infer<typeof createProductSchema>;
export type ProductEdit = z.infer<typeof editProductSchema>;
export type Category = z.infer<typeof categorySchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type CategoryEdit = z.infer<typeof categoryEditSchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
