import { locationIdsSchema } from './location-selection.js';
import { z } from 'zod';
import { currencySchema } from './conventions.js';
import { stockOverviewSchema } from './stock-overview.js';
export const dashboardQuerySchema = z
  .object({
    currency: currencySchema.default('USD'),
    storeId: z.uuid().optional(),
    warehouseIds: locationIdsSchema,
    days: z.coerce
      .number()
      .pipe(z.union([z.literal(7), z.literal(30)]))
      .default(30),
  })
  .strict();
const amount = z.string().regex(/^\d+$/);
export const dashboardSchema = z
  .object({
    currency: currencySchema,
    from: z.iso.date(),
    to: z.iso.date(),
    asOf: z.iso.datetime(),
    sales: z
      .object({
        todayMinor: amount,
        yesterdayMinor: amount,
        todayOrders: amount,
        averageBasketMinor: amount,
        periodMinor: amount,
        previousMinor: amount,
        periodOrders: amount,
        trend: z.array(z.object({ date: z.iso.date(), totalMinor: amount })).max(30),
        recent: z
          .array(
            z.object({
              id: z.uuid(),
              createdAt: z.iso.datetime(),
              state: z.enum(['completed', 'partially_returned', 'returned', 'voided']),
              totalMinor: amount,
              name: z.string(),
              sku: z.string(),
              lines: amount,
            }),
          )
          .max(6),
        topProducts: z
          .array(z.object({ id: z.uuid(), name: z.string(), sku: z.string(), totalMinor: amount }))
          .max(5),
      })
      .strict()
      .nullable(),
    inventory: z
      .object({
        lowStock: z.number().int().nonnegative(),
        outOfStock: z.number().int().nonnegative(),
        threshold: z.string(),
        items: stockOverviewSchema.shape.items.max(6),
      })
      .strict()
      .nullable(),
  })
  .strict();
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type DashboardSnapshot = z.infer<typeof dashboardSchema>;
