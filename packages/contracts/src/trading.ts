import { z } from 'zod';
import { operationKeySchema, currencySchema } from './conventions.js';
export const stage6PageQuery = z
  .object({ offset: z.coerce.number().int().min(0).max(100000).default(0) })
  .strict();
const command = { idempotencyKey: operationKeySchema };
export const tradingInviteSchema = z.object({ partnerId: z.uuid(), ...command }).strict();
export const tradingConsentSchema = z
  .object({
    action: z.enum(['accept', 'revoke']),
    version: z.number().int().positive(),
    ...command,
  })
  .strict();
export const tradingLineSchema = z
  .object({
    description: z.string().trim().min(1).max(160),
    quantity: z
      .string()
      .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/)
      .refine((s) => /[1-9]/.test(s)),
    unit: z.string().trim().min(1).max(30),
    unitPriceMinor: z.string().regex(/^(0|[1-9]\d{0,14})$/),
  })
  .strict();
export const tradingOrderInput = z
  .object({
    relationshipId: z.uuid(),
    reference: z.string().trim().min(3).max(120),
    currency: currencySchema,
    lines: z.array(tradingLineSchema).min(1).max(50),
    ...command,
  })
  .strict();
export const tradingTransitionSchema = z
  .object({
    action: z.enum(['accept', 'dispatch', 'receive', 'cancel']),
    version: z.number().int().positive(),
    note: z.string().trim().min(3).max(240),
    ...command,
  })
  .strict();
export const tradingRelationshipSchema = z.object({
  id: z.uuid(),
  proposerId: z.uuid(),
  partnerId: z.uuid(),
  state: z.enum(['pending', 'active', 'revoked']),
  version: z.number().int(),
});
export const tradingOrderSchema = z.object({
  id: z.uuid(),
  relationshipId: z.uuid(),
  buyerId: z.uuid(),
  sellerId: z.uuid(),
  reference: z.string(),
  currency: currencySchema,
  lines: z.array(tradingLineSchema),
  state: z.enum(['submitted', 'accepted', 'dispatched', 'received', 'cancelled']),
  version: z.number().int(),
  createdAt: z.string(),
});
export const tradingPageSchema = z.object({
  relationships: z.array(tradingRelationshipSchema).max(50),
  orders: z.array(tradingOrderSchema).max(50),
  hasMoreRelationships: z.boolean(),
  hasMoreOrders: z.boolean(),
  offset: z.number(),
});
export type TradingOrder = z.infer<typeof tradingOrderSchema>;
export type TradingRelationship = z.infer<typeof tradingRelationshipSchema>;
export type TradingInvite = z.infer<typeof tradingInviteSchema>;
export type TradingConsent = z.infer<typeof tradingConsentSchema>;
export type TradingOrderInput = z.infer<typeof tradingOrderInput>;
export type TradingTransition = z.infer<typeof tradingTransitionSchema>;
