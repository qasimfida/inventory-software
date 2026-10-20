import { z } from 'zod';
import { currencySchema, operationKeySchema } from './conventions.js';
import { nonnegativeMinorSchema, positiveMinorSchema } from './customers.js';
export const shiftOpenSchema = z
  .object({
    warehouseId: z.uuid(),
    terminalId: z.uuid(),
    currency: currencySchema,
    openingMinor: nonnegativeMinorSchema,
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const shiftCloseSchema = z
  .object({ countedMinor: nonnegativeMinorSchema, idempotencyKey: operationKeySchema })
  .strict();
export const cashAdjustmentSchema = z
  .object({
    kind: z.enum(['cash_in', 'cash_out']),
    amountMinor: positiveMinorSchema,
    reference: z.string().trim().min(3).max(120),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const shiftQuerySchema = z
  .object({ warehouseId: z.uuid(), offset: z.coerce.number().int().min(0).max(100000).default(0) })
  .strict();
export const shiftSchema = z.object({
  id: z.uuid(),
  warehouseId: z.uuid(),
  terminalId: z.uuid(),
  actorId: z.uuid(),
  currency: currencySchema,
  openingMinor: z.string(),
  state: z.enum(['open', 'closed']),
  expectedMinor: z.string(),
  countedMinor: z.string().nullable(),
  discrepancyMinor: z.string().nullable(),
  openedAt: z.string(),
  closedAt: z.string().nullable(),
});
export const shiftPageSchema = z.object({
  shifts: z.array(shiftSchema),
  hasMore: z.boolean(),
  offset: z.number(),
});
export type ShiftOpen = z.infer<typeof shiftOpenSchema>;
export type ShiftClose = z.infer<typeof shiftCloseSchema>;
export type CashAdjustment = z.infer<typeof cashAdjustmentSchema>;
export type ShiftQuery = z.infer<typeof shiftQuerySchema>;
