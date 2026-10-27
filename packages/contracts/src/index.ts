import { z } from 'zod';

export const API_PREFIX = '/api/v1';

export const apiOriginSchema = z
  .url({ normalize: true })
  .refine(
    (value) => /^https?:\/\/[^/?#@\s\\]+\/?$/i.test(value),
    'Use an HTTP(S) origin without credentials, query or path.',
  )
  .transform((value) => value.replace(/\/$/, ''));

export const healthResponseSchema = z.object({ status: z.literal('ok') }).strict();
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const apiErrorSchema = z
  .object({
    code: z.enum([
      'BAD_REQUEST',
      'NOT_FOUND',
      'UNAVAILABLE',
      'INTERNAL_ERROR',
      'REQUEST_FAILED',
      'UNAUTHENTICATED',
      'FORBIDDEN',
      'RATE_LIMITED',
      'CONFLICT',
      'PRICE_UNAVAILABLE',
      'CART_CURRENCY_MISMATCH',
      'CHECKOUT_STORE_REQUIRED',
      'LISTING_CHANGED',
      'STOREFRONT_CHANGED',
      'LISTING_TRANSITION_INVALID',
      'STOREFRONT_SETUP_INCOMPLETE',
    ]),
    message: z.string(),
    requestId: z.string().uuid(),
    retryable: z.boolean(),
    fields: z.array(z.object({ path: z.string(), code: z.string() })).optional(),
  })
  .strict();
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;

export {
  sessionSchema,
  authResponseSchema,
  sessionsSchema,
  authMutationSchema,
  recoveryStatusSchema,
} from './auth.js';
export type { Session, ActiveSession } from './auth.js';
export * from './organization.js';

export * from './permissions.js';
export * from './conventions.js';
export * from './catalog.js';
export * from './pricing.js';
export * from './inventory.js';

export * from './purchasing.js';
export * from './storage.js';
export * from './transfers.js';
export * from './customers.js';
export * from './sales.js';
export * from './cash.js';
export * from './returns.js';
export * from './offline.js';

export * from './counts.js';
export * from './payables.js';
export * from './settings.js';
export * from './security.js';
export * from './reports.js';
export * from './industry.js';
export * from './business-notifications.js';
export * from './warehouse-view.js';
export * from './trading.js';
export * from './accounting.js';
export * from './integrations.js';
export * from './stock-overview.js';
export * from './dashboard.js';
export * from './platform-overview.js';

export * from './company-profile.js';

export * from './platform-businesses.js';
export * from './operations.js';
export * from './bulk-import.js';

export * from './setup-checklist.js';
export * from './stock-planning.js';
export * from './storefront.js';
export * from './storefront-readiness.js';
export * from './storefront-management.js';
export * from './storefront-transitions.js';
export * from './storefront-commands.js';
export * from './storefront-media.js';
export * from './storefront-products.js';

export * from './storefront-messages.js';
