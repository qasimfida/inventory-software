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

export const importFieldSchema = z.enum([
  'sku',
  'name',
  'description',
  'price',
  'currency',
  'quantity',
]);
export const importMappingSchema = z
  .object({
    sku: z.string().min(1).max(120),
    name: z.string().min(1).max(120),
    price: z.string().min(1).max(120),
    currency: z.string().min(1).max(120),
    description: z.string().max(120).default(''),
    quantity: z.string().max(120).default(''),
  })
  .strict()
  .refine((value) => {
    const columns = Object.values(value).filter(Boolean);
    return new Set(columns).size === columns.length;
  }, 'Each source column can map to only one product field.');
export const importTemplateInputSchema = z
  .object({ name: z.string().trim().min(1).max(80), mapping: importMappingSchema })
  .strict();
export const importTemplateEditSchema = importTemplateInputSchema.extend({
  version: z.number().int().positive(),
});
export const importTemplateSchema = importTemplateEditSchema.extend({ id: z.uuid() });
export const importTemplatesSchema = z.object({ items: z.array(importTemplateSchema).max(50) });
export const importValidationSchema = z.object({
  errors: z.array(
    z.object({ row: z.number().int().min(2), field: z.string(), message: z.string() }),
  ),
});
export type ImportMapping = z.infer<typeof importMappingSchema>;
export type ImportTemplate = z.infer<typeof importTemplateSchema>;
export type ImportTemplateInput = z.infer<typeof importTemplateInputSchema>;
export type ImportIssue = z.infer<typeof importValidationSchema>['errors'][number];
