import { z } from 'zod';
import { operationKeySchema, positiveQuantitySchema } from './conventions.js';
const target = {
  variantId: z.uuid(),
  warehouseId: z.uuid(),
  locationId: z.uuid().nullable().default(null),
};
export const movementInputSchema = z
  .object({
    ...target,
    unitId: z.uuid(),
    quantity: positiveQuantitySchema,
    type: z.enum([
      'opening',
      'receive',
      'sale',
      'return',
      'adjustment_in',
      'adjustment_out',
      'damage',
      'restore',
    ]),
    reason: z.string().trim().min(3).max(240),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const reservationInputSchema = z
  .object({
    ...target,
    unitId: z.uuid(),
    quantity: positiveQuantitySchema,
    reason: z.string().trim().min(3).max(240),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const stockCommandSchema = z
  .object({ reason: z.string().trim().min(3).max(240), idempotencyKey: operationKeySchema })
  .strict();
export const inventoryPolicySchema = z
  .object({ allowNegative: z.boolean(), version: z.number().int().positive() })
  .strict();
export const stockQuerySchema = z
  .object({
    warehouseId: z.uuid(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
    search: z.string().trim().max(120).default(''),
    cursor: z
      .string()
      .regex(/^[1-9][0-9]{0,17}$/)
      .optional(),
  })
  .strict();
export const movementSchema = z.object({
  id: z.uuid(),
  variantId: z.uuid(),
  warehouseId: z.uuid(),
  locationId: z.uuid(),
  quantityDelta: z.string(),
  reservedDelta: z.string(),
  damagedDelta: z.string(),
  transitDelta: z.string(),
  type: z.string(),
  sourceKind: z.string(),
  sourceId: z.uuid(),
  actorId: z.uuid(),
  reason: z.string(),
  createdAt: z.iso.datetime(),
  reversalOf: z.uuid().nullable(),
});
export const stockWorkspaceSchema = z.object({
  totals: z.object({ items: z.number(), balances: z.number(), reservations: z.number() }),
  limit: z.number(),
  offset: z.number(),
  hasMore: z.boolean(),
  items: z.array(
    z.object({ id: z.uuid(), name: z.string(), sku: z.string(), baseUnitId: z.uuid() }),
  ),
  units: z.array(z.object({ id: z.uuid(), name: z.string(), code: z.string() })),
  locations: z.array(z.object({ id: z.uuid(), name: z.string(), code: z.string() })),
  balances: z.array(
    z.object({
      variantId: z.uuid(),
      sku: z.string(),
      locationId: z.uuid(),
      locationName: z.string(),
      onHand: z.string(),
      reserved: z.string(),
      damaged: z.string(),
      inTransit: z.string(),
      available: z.string(),
      version: z.number().int(),
    }),
  ),
  movements: z.array(movementSchema),
  nextCursor: z.string().nullable(),
  reservations: z.array(
    z.object({
      id: z.uuid(),
      variantId: z.uuid(),
      quantity: z.string(),
      remaining: z.string(),
      state: z.string(),
      locationId: z.uuid(),
    }),
  ),
  policy: inventoryPolicySchema,
});
export const reservationSchema = z.object({
  id: z.uuid(),
  quantity: z.string(),
  locationId: z.uuid(),
});
export type MovementInput = z.infer<typeof movementInputSchema>;
export type ReservationInput = z.infer<typeof reservationInputSchema>;
export type StockCommand = z.infer<typeof stockCommandSchema>;
export type StockQuery = z.infer<typeof stockQuerySchema>;

export const reconciliationSchema = z.object({
  consistent: z.boolean(),
  mismatches: z.array(z.object({ variantId: z.uuid(), locationId: z.uuid() })),
});
