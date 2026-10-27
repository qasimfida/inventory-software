import { z } from 'zod';
import { currencySchema } from './conventions.js';
import { channelListingSchema, listingPageSchema } from './storefront-management.js';
import { listingIssueSchema } from './storefront-readiness.js';
const variant = z
  .object({
    id: z.string(),
    sku: z.string(),
    unit: z.string(),
    complete: z.boolean(),
    priceMinor: z.string().nullable(),
    currency: z.string().nullable(),
    posPriceMinor: z.string().nullable().default(null),
  })
  .strict();
export const onlineProductSourceSchema = z
  .object({
    exists: z.boolean(),
    state: z.string(),
    title: z.string(),
    description: z.string(),
    images: z.array(z.string()),
    allowedHosts: z.array(z.string()),
    category: z.boolean(),
    currency: currencySchema,
    variants: z.array(variant),
    hasStockSource: z.boolean(),
    soldOut: z.boolean(),
    lowStock: z.boolean(),
  })
  .strict();
export const onlineProductPreviewSchema = z
  .object({
    categoryName: z.string().default('Uncategorized'),
    productId: z.uuid(),
    listingId: z.uuid().nullable(),
    title: z.string(),
    source: onlineProductSourceSchema,
    inherited: onlineProductSourceSchema,
    quantity: z.string(),
    issues: z.array(listingIssueSchema),
    images: z.array(z.string()),
    soldOutBehavior: z.enum(['show', 'hide']),
  })
  .strict();
export const onlineProductDetailSchema = z
  .object({
    listing: channelListingSchema,
    preview: onlineProductPreviewSchema,
  })
  .strict();
export const onlinePickerQuerySchema = z
  .object({
    inStock: z.enum(['true', 'false']).default('false'),
    readiness: z.enum(['all', 'ready', 'issues', 'inactive']).default('all'),
    search: z.string().max(120).default(''),
    category: z.uuid().optional(),
    offset: z.coerce.number().int().min(0).max(1000000).default(0),
    limit: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict();
export const onlinePickerPageSchema = z
  .object({
    items: z.array(onlineProductPreviewSchema),
    total: z.number().int().nonnegative(),
    categories: z.array(z.object({ id: z.uuid(), name: z.string() })),
    hasMore: z.boolean(),
  })
  .strict();
export type OnlineProductPreview = z.infer<typeof onlineProductPreviewSchema>;
export type OnlineProductDetail = z.infer<typeof onlineProductDetailSchema>;
export type OnlinePickerQuery = z.infer<typeof onlinePickerQuerySchema>;

export const onlineProductPageSchema = z
  .object({ page: listingPageSchema, previews: z.record(z.string(), onlineProductPreviewSchema) })
  .strict();
