import { z } from 'zod';
import {
  onlineStoreSettingsSchema,
  onlineOverridesSchema,
  storefrontHostSchema,
} from './storefront-management.js';
export const onlineCommandSchema = z.discriminatedUnion('action', [
  z
    .object({
      action: z.literal('settings'),
      settings: onlineStoreSettingsSchema,
      idempotencyKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.enum(['enable', 'disable']),
      version: z.number().int().positive(),
      idempotencyKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.enum(['add-host', 'remove-host']),
      host: storefrontHostSchema,
      version: z.number().int().positive(),
      idempotencyKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal('select'),
      items: z
        .array(z.object({ productId: z.uuid(), variantId: z.uuid().nullable() }).strict())
        .min(1)
        .max(200),
      idempotencyKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.enum(['validate', 'publish', 'pause', 'resume', 'remove']),
      items: z
        .array(z.object({ id: z.uuid(), version: z.number().int().positive() }).strict())
        .max(200),
      all: z.boolean().default(false),
      idempotencyKey: z.uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal('overrides'),
      id: z.uuid(),
      version: z.number().int().positive(),
      overrides: onlineOverridesSchema,
      idempotencyKey: z.uuid(),
    })
    .strict(),
]);
export const onlineResultSchema = z
  .object({
    items: z.array(
      z.object({
        id: z.string(),
        ok: z.boolean(),
        code: z.string(),
        version: z.number().int().optional(),
      }),
    ),
    ok: z.boolean(),
  })
  .strict();

export type OnlineCommand = z.infer<typeof onlineCommandSchema>;
