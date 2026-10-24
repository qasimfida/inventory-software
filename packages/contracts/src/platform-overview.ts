import { z } from 'zod';
export const platformOverviewQuerySchema = z
  .object({
    search: z.string().trim().max(120).default(''),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
const count = z.string().regex(/^\d+$/);
export const platformOverviewSchema = z
  .object({
    asOf: z.iso.datetime(),
    totals: z.object({
      businesses: count,
      activeBusinesses: count,
      accounts: count,
      stores: count,
      warehouses: count,
      terminals: count,
    }),
    registrations: z.array(z.object({ date: z.iso.date(), count })).max(30),
    businesses: z
      .array(
        z.object({
          id: z.uuid(),
          name: z.string(),
          state: z.enum(['active', 'suspended', 'archived']),
          createdAt: z.iso.datetime(),
        }),
      )
      .max(25),
    total: count,
    offset: z.number().int(),
    hasMore: z.boolean(),
  })
  .strict();
export type PlatformOverview = z.infer<typeof platformOverviewSchema>;
