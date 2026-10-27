import {
  evaluateStorefrontReadiness,
  STOREFRONT_RULE_VERSION,
  imageUrlHost,
} from './storefront-readiness.js';
import { z } from 'zod';
import { currencySchema, pageQuerySchema } from './conventions.js';
export const storefrontSettingsSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .min(3)
      .max(60),
    name: z.string().trim().min(2).max(120),
    storeId: z.uuid(),
    currency: currencySchema,
    contact: z.string().trim().max(200),
    fulfillment: z.enum(['pickup', 'delivery', 'both']),
    returnPolicy: z.string().trim().max(4000),
    shippingPolicy: z.string().max(4000).default(''),
    hideSoldOut: z.boolean().default(false),
    enabled: z.boolean().default(false),
    version: z.number().int().nonnegative(),
    idempotencyKey: z.uuid().optional(),
  })
  .strict();
export const listingInputSchema = z
  .object({
    productId: z.uuid(),
    title: z.string().trim().max(120).default(''),
    description: z.string().trim().max(2000).default(''),
    images: z
      .array(z.url({ protocol: /^https$/ }).max(500))
      .max(5)
      .default([]),
    weightGrams: z.number().int().positive().max(100000000).nullable().default(null),
    version: z.number().int().nonnegative(),
    idempotencyKey: z.uuid().optional(),
  })
  .strict();
export const listingCommandSchema = z
  .object({
    version: z.number().int().positive(),
    action: z.enum(['publish', 'pause', 'remove']),
    idempotencyKey: z.uuid().optional(),
  })
  .strict();
export const publicProductSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    description: z.string(),
    images: z.array(z.string()),
    availability: z.enum(['in_stock', 'sold_out']),
    variants: z.array(
      z.object({
        id: z.uuid(),
        name: z.string(),
        sku: z.string(),
        unit: z.string(),
        currency: currencySchema,
        totalMinor: z.string(),
        taxMinor: z.string(),
      }),
    ),
  })
  .strict();
export const listingSchema = listingInputSchema.extend({
  productName: z.string().default(''),
  id: z.uuid(),
  state: z.enum(['needs_changes', 'ready', 'active', 'paused', 'delisted']),
  issues: z.array(z.string()),
  ruleVersion: z.number().int(),
  projection: publicProductSchema.nullable(),
});
export const storefrontWorkspaceSchema = z.object({
  settings: storefrontSettingsSchema.nullable(),
  defaults: storefrontSettingsSchema
    .pick({ name: true, slug: true, storeId: true, currency: true, contact: true })
    .partial()
    .default({}),
  prerequisites: z.array(z.string()),
  listings: z.array(listingSchema),
  trustedMediaOrigins: z.array(z.string()),
});
export const publicStorefrontSchema = z
  .object({
    name: z.string(),
    slug: z.string(),
    contact: z.string(),
    returnPolicy: z.string(),
    shippingPolicy: z.string(),
    currency: currencySchema,
    items: z.array(publicProductSchema),
    hasMore: z.boolean(),
    offset: z.number(),
  })
  .strict();
export const storefrontPageSchema = pageQuerySchema.pick({ offset: true, limit: true });
export const storefrontRuleVersion = STOREFRONT_RULE_VERSION;
/** Compatibility adapter; all content rules are owned by the structured engine. */
export function storefrontReadiness(
  input: {
    title: string;
    description: string;
    images: string[];
    category: boolean;
    active: boolean;
    variantsValid: boolean;
    delivery: boolean;
    weightGrams: number | null;
  },
  trustedOrigins: readonly string[],
) {
  return evaluateStorefrontReadiness({
    exists: true,
    state: input.active ? 'active' : 'inactive',
    title: input.title,
    description: input.description,
    images: input.images,
    category: input.category,
    allowedHosts: trustedOrigins.map((o) => imageUrlHost(o) ?? ''),
    currency: 'USD',
    hasStockSource: true,
    soldOut: false,
    lowStock: false,
    variants: [
      {
        id: 'legacy',
        sku: 'legacy',
        unit: 'EACH',
        complete: input.variantsValid,
        priceMinor: input.variantsValid ? '1' : null,
        currency: 'USD',
      },
    ],
  })
    .issues.filter((i) => i.severity === 'error')
    .map((i) => i.message);
}
export type StorefrontSettings = z.infer<typeof storefrontSettingsSchema>;
export type ListingInput = z.infer<typeof listingInputSchema>;
export type StorefrontWorkspace = z.infer<typeof storefrontWorkspaceSchema>;
