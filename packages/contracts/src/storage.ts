import { z } from 'zod';
import { positiveQuantitySchema, operationKeySchema } from './conventions.js';
export const storageInputSchema = z
  .object({
    warehouseId: z.uuid(),
    parentId: z.uuid(),
    name: z.string().trim().min(1).max(120),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{1,40}$/),
    type: z.enum(['zone', 'aisle', 'rack', 'shelf', 'bin']),
    state: z.enum(['active', 'inactive', 'archived']).default('active'),
    notes: z.string().trim().max(1000).default(''),
    photos: z
      .array(z.url().refine((v) => v.startsWith('https://')))
      .max(5)
      .default([]),
    capacity: positiveQuantitySchema.nullable().default(null),
    capacityUnit: z.string().trim().max(40).default(''),
  })
  .strict()
  .refine((v) => v.capacity === null || v.capacityUnit.length > 0, 'Capacity requires a unit');
export const storageUpdateSchema = storageInputSchema.safeExtend({
  version: z.number().int().positive(),
});
export const storageLocationSchema = z.object({
  id: z.uuid(),
  warehouseId: z.uuid(),
  parentId: z.uuid().nullable(),
  name: z.string(),
  code: z.string(),
  type: z.enum(['warehouse', 'zone', 'aisle', 'rack', 'shelf', 'bin']),
  state: z.enum(['active', 'inactive', 'archived']),
  notes: z.string(),
  photos: z.array(z.string()),
  capacity: z.string().nullable(),
  capacityUnit: z.string(),
  version: z.number().int(),
});
export const storageQuerySchema = z
  .object({
    warehouseId: z.uuid(),
    search: z.string().trim().max(120).default(''),
    type: z.enum(['warehouse', 'zone', 'aisle', 'rack', 'shelf', 'bin']).optional(),
    state: z.enum(['active', 'inactive', 'archived']).optional(),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const storageWorkspaceSchema = z.object({
  locations: z.array(storageLocationSchema),
  hasMore: z.boolean(),
  offset: z.number(),
  totals: z.array(
    z.object({
      variantId: z.uuid(),
      onHand: z.string(),
      reserved: z.string(),
      damaged: z.string(),
      inTransit: z.string(),
    }),
  ),
});
export const storageMoveSchema = z
  .object({
    warehouseId: z.uuid(),
    variantId: z.uuid(),
    unitId: z.uuid(),
    sourceId: z.uuid(),
    destinationId: z.uuid(),
    quantity: positiveQuantitySchema,
    reason: z.string().trim().min(3).max(240),
    idempotencyKey: operationKeySchema,
  })
  .strict()
  .refine((v) => v.sourceId !== v.destinationId, 'Choose different locations');
export type StorageInput = z.infer<typeof storageInputSchema>;
export type StorageQuery = z.infer<typeof storageQuerySchema>;
export type StorageMove = z.infer<typeof storageMoveSchema>;
