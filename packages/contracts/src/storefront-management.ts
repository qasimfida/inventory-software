import { z } from 'zod';
import { currencySchema } from './conventions.js';
import { listingIssueSchema, validImageHost } from './storefront-readiness.js';
export const storefrontHostSchema = z
  .string()
  .trim()
  .max(253)
  .refine(
    validImageHost,
    'Use an exact public DNS hostname, without a URL, port, path or wildcard.',
  );
export const storefrontSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .refine(
    (v) => !['admin', 'api', 'login', 'www', 'settings', 'public', 'assets'].includes(v),
    'This slug is reserved.',
  );
export const onlineStoreSettingsSchema = z
  .object({
    businessId: z.uuid(),
    storeId: z.uuid(),
    enabled: z.boolean(),
    status: z.enum(['not_configured', 'configured', 'live', 'disabled']),
    name: z.string().trim().min(2).max(120),
    slug: storefrontSlugSchema,
    currency: currencySchema,
    contact: z
      .object({
        email: z.union([z.email(), z.literal('')]),
        phone: z.string().max(80),
        address: z.string().max(1000),
      })
      .strict(),
    fulfillment: z
      .object({
        pickup: z
          .object({
            enabled: z.boolean(),
            locationId: z.uuid().nullable(),
            instructions: z.string().max(2000),
            hours: z.string().max(500),
          })
          .strict(),
        cashOnDelivery: z.boolean(),
        manualBankTransfer: z
          .object({ enabled: z.boolean(), instructions: z.string().max(2000) })
          .strict(),
      })
      .strict(),
    returnPolicy: z.string().max(4000),
    shippingPolicy: z.string().max(4000),
    stockSources: z.array(z.uuid()).max(200),
    safetyBuffer: z.string().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/),
    soldOutBehavior: z.enum(['show', 'hide']),
    allowedImageHosts: z.array(storefrontHostSchema).max(50),
    version: z.number().int().nonnegative(),
  })
  .strict();
export const onlineOverridesSchema = z
  .object({
    title: z.string().trim().max(120).nullable(),
    description: z.string().trim().max(2000).nullable(),
    images: z.array(z.string().max(500)).max(5).nullable(),
    price: z
      .object({
        unitPrice: z.string().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/),
        currency: currencySchema,
      })
      .strict()
      .nullable(),
    visible: z.boolean(),
  })
  .strict();
export const listingStatusSchema = z.enum([
  'selected',
  'needs_changes',
  'ready',
  'active',
  'paused',
]);
export const channelListingSchema = z
  .object({
    id: z.uuid(),
    businessId: z.uuid(),
    storeId: z.uuid(),
    productId: z.uuid(),
    variantId: z.uuid().nullable(),
    status: listingStatusSchema,
    issues: z.array(listingIssueSchema),
    ruleVersion: z.number().int(),
    overrides: onlineOverridesSchema,
    publishedAt: z.string().nullable(),
    pausedAt: z.string().nullable(),
    lastValidatedAt: z.string().nullable(),
    version: z.number().int().positive(),
    title: z.string(),
    availability: z.enum(['IN_STOCK', 'SOLD_OUT']),
  })
  .strict();
export const listingEventSchema = z
  .object({
    id: z.string(),
    listingId: z.uuid(),
    actorId: z.uuid().nullable(),
    transition: z.string(),
    reasonCode: z.string(),
    before: z.record(z.string(), z.unknown()),
    after: z.record(z.string(), z.unknown()),
    timestamp: z.string(),
  })
  .strict();
export const listingQuerySchema = z
  .object({
    productIds: z
      .string()
      .max(7400)
      .refine(
        (v) =>
          v.split(',').length <= 200 && v.split(',').every((id) => z.uuid().safeParse(id).success),
        'Invalid product IDs',
      )
      .optional(),
    status: listingStatusSchema.optional(),
    attention: z.enum(['sold-out', 'warnings']).optional(),
    tab: z.enum(['active', 'changes-required', 'ready']).optional(),
    search: z.string().max(120).default(''),
    category: z.uuid().optional(),
    issue: z.string().max(80).optional(),
    sort: z.enum(['title', 'updated']).default('title'),
    cursor: z.string().max(2000).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();
export const listingCountsSchema = z.object({
  selected: z.number(),
  needs_changes: z.number(),
  ready: z.number(),
  active: z.number(),
  paused: z.number(),
});
export const listingPageSchema = z
  .object({
    items: z.array(channelListingSchema),
    counts: listingCountsSchema,
    nextCursor: z.string().nullable(),
    asOf: z.string(),
  })
  .strict();
export const onlineSettingsResultSchema = z
  .object({
    settings: onlineStoreSettingsSchema.nullable(),
    defaults: z.record(z.string(), z.unknown()),
    prerequisites: z.array(z.string()),
  })
  .strict();
export const slugResultSchema = z
  .object({ available: z.boolean(), suggestions: z.array(z.string()) })
  .strict();
export const hostImpactSchema = z
  .object({ host: z.string(), count: z.number(), listingIds: z.array(z.uuid()) })
  .strict();
export const onlineOverviewSchema = z
  .object({
    status: z.enum(['not_configured', 'configured', 'live', 'disabled']),
    counts: listingCountsSchema,
    soldOut: z.number(),
    warnings: z.number(),
    lastValidatedAt: z.string().nullable(),
    asOf: z.string(),
  })
  .strict();
export type OnlineStoreSettings = z.infer<typeof onlineStoreSettingsSchema>;
export type OnlineOverrides = z.infer<typeof onlineOverridesSchema>;
export type ChannelListing = z.infer<typeof channelListingSchema>;
export type ListingQuery = z.infer<typeof listingQuerySchema>;
