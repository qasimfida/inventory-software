import { z } from 'zod';
import { organizationStateSchema, locationSchema } from './organization.js';
export const platformBusinessesQuerySchema = z
  .object({
    search: z.string().trim().max(120).default(''),
    state: z.enum(['all', 'active', 'suspended', 'archived']).default('all'),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const platformBusinessSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    state: organizationStateSchema,
    timeZone: z.string(),
    createdAt: z.iso.datetime(),
    storeCount: z.string().regex(/^\d+$/).optional(),
    warehouseCount: z.string().regex(/^\d+$/).optional(),
  })
  .strict();
export const platformBusinessesSchema = z
  .object({
    businesses: z.array(platformBusinessSchema).max(25),
    total: z.string().regex(/^\d+$/),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
  .strict();
export const platformBusinessDetailSchema = z
  .object({
    business: platformBusinessSchema,
    locations: z.array(locationSchema).max(25),
    offset: z.number().int().nonnegative(),
    hasMore: z.boolean(),
  })
  .strict();
export type PlatformBusiness = z.infer<typeof platformBusinessSchema>;
export type PlatformBusinessDetail = z.infer<typeof platformBusinessDetailSchema>;
export type PlatformBusinessesQuery = z.input<typeof platformBusinessesQuerySchema>;
