import { displayPriceSchema } from './catalog.js';
import { locationIdsSchema } from './location-selection.js';
import { z } from 'zod';
import { stockQuerySchema } from './inventory.js';
export const stockStatusSchema = z.enum(['all', 'in-stock', 'low-stock', 'out-of-stock']);
export type StockStatus = z.infer<typeof stockStatusSchema>;
export const stockOverviewQuerySchema = stockQuerySchema.omit({ cursor: true }).extend({
  warehouseIds: locationIdsSchema,
  status: stockStatusSchema.default('all'),
});
export type StockOverviewQuery = z.infer<typeof stockOverviewQuerySchema>;
export const stockOverviewSchema = z.object({
  counts: z.object({
    all: z.number().int(),
    'in-stock': z.number().int(),
    'low-stock': z.number().int(),
    'out-of-stock': z.number().int(),
  }),
  threshold: z.string(),
  total: z.number().int(),
  offset: z.number().int(),
  limit: z.number().int(),
  items: z.array(
    z.object({
      id: z.uuid(),
      productId: z.uuid().optional(),
      price: displayPriceSchema.nullable().optional(),
      name: z.string(),
      sku: z.string(),
      unit: z.string(),
      available: z.string(),
      status: stockStatusSchema.exclude(['all']),
    }),
  ),
});
export type StockOverview = z.infer<typeof stockOverviewSchema>;
