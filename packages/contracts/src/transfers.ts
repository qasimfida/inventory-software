import { z } from 'zod';
import { decimalSchema, positiveQuantitySchema, operationKeySchema } from './conventions.js';
export const transferLineInputSchema = z
  .object({ variantId: z.uuid(), unitId: z.uuid(), quantity: positiveQuantitySchema })
  .strict();
export const transferInputSchema = z
  .object({
    sourceWarehouseId: z.uuid(),
    sourceLocationId: z.uuid().nullable().default(null),
    destinationWarehouseId: z.uuid(),
    destinationLocationId: z.uuid().nullable().default(null),
    reference: z.string().trim().min(1).max(80),
    lines: z.array(transferLineInputSchema).min(1).max(50),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const transferTransitionSchema = z
  .object({
    action: z.enum(['approve', 'dispatch', 'cancel']),
    version: z.number().int().positive(),
    reason: z.string().trim().min(3).max(240),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const transferReceiveSchema = z
  .object({
    lineId: z.uuid(),
    received: decimalSchema,
    damaged: decimalSchema.default('0'),
    shortage: decimalSchema.default('0'),
    reason: z.string().trim().min(3).max(240),
    idempotencyKey: operationKeySchema,
  })
  .strict()
  .refine(
    (v) => [v.received, v.damaged, v.shortage].some((q) => /[1-9]/.test(q)),
    'Enter a received quantity or discrepancy',
  );
export const transferSchema = z.object({
  id: z.uuid(),
  sourceWarehouseId: z.uuid(),
  sourceLocationId: z.uuid(),
  destinationWarehouseId: z.uuid(),
  destinationLocationId: z.uuid(),
  reference: z.string(),
  state: z.enum([
    'draft',
    'approved',
    'dispatched',
    'partially_received',
    'completed',
    'cancelled',
  ]),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
});
export const transferDetailSchema = z.object({
  transfer: transferSchema,
  lines: z.array(
    transferLineInputSchema.extend({
      id: z.uuid(),
      baseQuantity: z.string(),
      settled: z.string(),
      reservationId: z.uuid().nullable(),
    }),
  ),
  events: z.array(
    z.object({
      id: z.uuid(),
      action: z.string(),
      actorId: z.uuid(),
      reason: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
  receipts: z.array(
    z.object({
      id: z.uuid(),
      lineId: z.uuid(),
      received: z.string(),
      damaged: z.string(),
      shortage: z.string(),
      reason: z.string(),
      actorId: z.uuid(),
    }),
  ),
});
export const transferQuerySchema = z
  .object({
    warehouseId: z.uuid(),
    search: z.string().trim().max(120).default(''),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const transferWorkspaceSchema = z.object({
  transfers: z.array(transferSchema),
  hasMore: z.boolean(),
  offset: z.number(),
});
export type TransferInput = z.infer<typeof transferInputSchema>;
export type TransferTransition = z.infer<typeof transferTransitionSchema>;
export type TransferReceive = z.infer<typeof transferReceiveSchema>;
export type TransferQuery = z.infer<typeof transferQuerySchema>;
export type Transfer = z.infer<typeof transferSchema>;

export const transferAddLineSchema = transferLineInputSchema.extend({
  version: z.number().int().positive(),
  idempotencyKey: operationKeySchema,
});
export type TransferAddLine = z.infer<typeof transferAddLineSchema>;
