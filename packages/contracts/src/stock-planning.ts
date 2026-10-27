import { z } from 'zod';
import { decimalSchema, operationKeySchema, positiveQuantitySchema } from './conventions.js';
export const adjustmentDirections = ['in', 'out', 'damage', 'restore'] as const;
export const builtInStockReasons = [
  { code: 'opening_balance', label: 'Opening balance', directions: ['in'] },
  { code: 'count_correction', label: 'Count correction', directions: ['in', 'out'] },
  { code: 'damage', label: 'Damaged stock', directions: ['damage', 'restore'] },
  { code: 'loss', label: 'Loss', directions: ['out'] },
  { code: 'found_stock', label: 'Found stock', directions: ['in'] },
  {
    code: 'data_correction',
    label: 'Data correction',
    directions: ['in', 'out', 'damage', 'restore'],
  },
  {
    code: 'other',
    label: 'Other (explanation required)',
    directions: ['in', 'out', 'damage', 'restore'],
  },
] as const;
export const reasonCodeSchema = z.string().regex(/^[a-z][a-z0-9_]{1,47}$/);
export const stockReasonSchema = z.object({
  code: reasonCodeSchema,
  label: z.string().trim().min(2).max(80),
  directions: z.array(z.enum(adjustmentDirections)).min(1).max(4),
  active: z.boolean(),
  version: z.number().int().nonnegative(),
  builtin: z.boolean(),
});
export const stockReasonInputSchema = stockReasonSchema.omit({ builtin: true }).strict();
export const reorderInputSchema = z
  .object({
    variantId: z.uuid(),
    warehouseId: z.uuid(),
    locationId: z.uuid().nullable().default(null),
    reorderPoint: decimalSchema,
    targetQuantity: decimalSchema,
    active: z.boolean().default(true),
    version: z.number().int().nonnegative(),
  })
  .strict();
export const reorderSchema = reorderInputSchema.extend({
  locationId: z.uuid(),
  sku: z.string(),
  locationName: z.string(),
  available: z.string(),
  needsReorder: z.boolean(),
});
export const orderHoldInputSchema = z
  .object({
    warehouseId: z.uuid(),
    locationId: z.uuid().nullable().default(null),
    variantId: z.uuid(),
    unitId: z.uuid(),
    quantity: positiveQuantitySchema,
    reference: z.string().trim().min(2).max(80),
    expiresInMinutes: z.number().int().min(1).max(1440),
    reason: z.string().trim().min(3).max(240),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const orderHoldSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  warehouseId: z.uuid(),
  variantId: z.uuid(),
  reservationId: z.uuid(),
  quantity: z.string(),
  remaining: z.string(),
  state: z.enum(['open', 'cancelled', 'expired']),
  expiresAt: z.iso.datetime(),
  createdBy: z.uuid(),
  createdAt: z.iso.datetime(),
});
export const stockPlanningSchema = z.object({
  reasons: z.array(stockReasonSchema),
  reorders: z.array(reorderSchema),
  holds: z.array(orderHoldSchema),
  offset: z.number(),
  hasMore: z.boolean(),
});
export type StockReasonInput = z.infer<typeof stockReasonInputSchema>;
export type ReorderInput = z.infer<typeof reorderInputSchema>;
export type OrderHoldInput = z.infer<typeof orderHoldInputSchema>;
export type StockPlanning = z.infer<typeof stockPlanningSchema>;
