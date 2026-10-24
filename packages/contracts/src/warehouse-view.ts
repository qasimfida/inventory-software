import { z } from 'zod';
export const warehouseViewQuerySchema = z
  .object({
    warehouseId: z.uuid(),
    locationId: z.uuid().optional(),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
    stockOffset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
const node = z
  .object({
    id: z.uuid(),
    parentId: z.uuid().nullable(),
    name: z.string(),
    code: z.string(),
    type: z.string(),
    state: z.string(),
  })
  .strict();
export const warehouseViewSchema = z
  .object({
    node,
    children: z.array(node).max(50),
    hasMore: z.boolean(),
    stockHasMore: z.boolean(),
    stock: z
      .array(
        z
          .object({
            variantId: z.uuid(),
            sku: z.string(),
            unit: z.string(),
            onHand: z.string(),
            available: z.string(),
            damaged: z.string(),
            low: z.boolean(),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();
export type WarehouseViewQuery = z.infer<typeof warehouseViewQuerySchema>;
