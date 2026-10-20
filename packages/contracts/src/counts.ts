import { z } from 'zod';
import { decimalSchema } from './conventions.js';
export const countCreateSchema = z
  .object({
    warehouseId: z.uuid(),
    locationId: z.uuid().nullable().default(null),
    blind: z.boolean().default(true),
    variantIds: z
      .array(z.uuid())
      .min(1)
      .max(100)
      .refine((v) => new Set(v).size === v.length),
    idempotencyKey: z.uuid(),
  })
  .strict();
export const countCaptureSchema = z
  .object({
    variantId: z.uuid(),
    unitId: z.uuid(),
    quantity: decimalSchema.refine((q) => !q.startsWith('-')),
    version: z.number().int().positive(),
    idempotencyKey: z.uuid(),
  })
  .strict();
export const countCommandSchema = z
  .object({
    version: z.number().int().positive(),
    reason: z.string().trim().min(10).max(240),
    idempotencyKey: z.uuid(),
  })
  .strict();
export const countHeaderSchema = z.object({
  id: z.uuid(),
  warehouseId: z.uuid(),
  locationId: z.uuid(),
  blind: z.boolean(),
  state: z.enum(['draft', 'review', 'approved']),
  version: z.number().int(),
  createdBy: z.uuid(),
  approvedBy: z.uuid().nullable(),
  createdAt: z.string(),
  approvedAt: z.string().nullable(),
});
export const countDetailSchema = z.object({
  count: countHeaderSchema,
  lines: z.array(
    z.object({
      id: z.uuid(),
      variantId: z.uuid(),
      name: z.string(),
      sku: z.string(),
      expected: z.string().nullable(),
      counted: z.string().nullable(),
      unitId: z.uuid().nullable(),
      quantity: z.string().nullable(),
      countedBy: z.uuid().nullable(),
      countedAt: z.string().nullable(),
      attempt: z.number().int(),
      stale: z.boolean(),
    }),
  ),
});
export type CountCreate = z.infer<typeof countCreateSchema>;
export type CountCapture = z.infer<typeof countCaptureSchema>;
export type CountCommand = z.infer<typeof countCommandSchema>;
export type CountDetail = z.infer<typeof countDetailSchema>;
