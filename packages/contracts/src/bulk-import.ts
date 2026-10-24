import { z } from 'zod';
import { createProductSchema } from './catalog.js';
import { currencySchema, decimalSchema, operationKeySchema } from './conventions.js';
export const importRowSchema = z
  .object({
    sku: createProductSchema.shape.sku,
    name: createProductSchema.shape.name,
    description: z.string().max(2000).default(''),
    price: decimalSchema.refine((v) => !v.startsWith('-'), 'Price cannot be negative'),
    currency: currencySchema,
    quantity: decimalSchema.refine(
      (v) => !v.startsWith('-'),
      'Opening quantity cannot be negative',
    ),
  })
  .strict();
export const importInputSchema = z
  .object({
    warehouseId: z.uuid().nullable(),
    rows: z.array(importRowSchema).min(1).max(100),
    idempotencyKey: operationKeySchema,
  })
  .strict()
  .refine(
    (v) => !!v.warehouseId || v.rows.every((r) => Number(r.quantity) === 0),
    'Select a warehouse for opening stock',
  )
  .refine(
    (v) => new Set(v.rows.map((r) => r.sku)).size === v.rows.length,
    'Duplicate SKU in import',
  );
export const importResultSchema = z.object({
  created: z.number().int(),
  products: z.array(z.uuid()),
});
export type ImportRow = z.infer<typeof importRowSchema>;
export type ImportInput = z.infer<typeof importInputSchema>;
