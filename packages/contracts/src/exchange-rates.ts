import { z } from 'zod';
import { currencySchema } from './conventions.js';
/** Provider decimals remain strings; rates are indicative, never settlement instructions. */
export const exchangeRateSchema = z
  .string()
  .regex(/^(?:0|[1-9][0-9]{0,11})(?:\.[0-9]{1,18})?$/)
  .refine((v) => /[1-9]/.test(v));
export const exchangeSnapshotSchema = z
  .object({
    source: z.literal('Open Exchange Rates'),
    base: z.literal('USD'),
    asOf: z.iso.datetime(),
    fetchedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    rates: z.partialRecord(currencySchema, exchangeRateSchema),
  })
  .strict()
  .refine((v) => v.rates.USD === '1' && Date.parse(v.expiresAt) === Date.parse(v.asOf) + 86400000);
export const exchangeResponseSchema = z
  .object({
    snapshot: exchangeSnapshotSchema.nullable(),
    reason: z.enum(['not-configured', 'unavailable', 'stale']).nullable(),
  })
  .strict();
export type ExchangeSnapshot = z.infer<typeof exchangeSnapshotSchema>;
export type ExchangeResponse = z.infer<typeof exchangeResponseSchema>;
