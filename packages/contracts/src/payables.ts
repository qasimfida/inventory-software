import { z } from 'zod';
import { operationKeySchema, currencySchema } from './conventions.js';
import { positiveMinorSchema } from './customers.js';
export const supplierSettlementSchema = z
  .object({
    kind: z.enum(['payment', 'refund']),
    amountMinor: positiveMinorSchema,
    reference: z.string().trim().min(3).max(120),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const supplierCreditSchema = z
  .object({
    returnId: z.uuid(),
    amountMinor: positiveMinorSchema,
    reference: z.string().trim().min(3).max(120),
    reason: z.string().trim().min(3).max(240),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const payableQuerySchema = z
  .object({
    warehouseId: z.uuid(),
    supplierId: z.uuid().optional(),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const payableHistoryQuerySchema = z
  .object({
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const payableSchema = z.object({
  id: z.uuid(),
  purchaseId: z.uuid(),
  supplierId: z.uuid(),
  supplierName: z.string(),
  warehouseId: z.uuid(),
  currency: currencySchema,
  reference: z.string(),
  dueDate: z.string(),
  amountMinor: z.string(),
  creditMinor: z.string(),
  paidMinor: z.string(),
  refundedMinor: z.string(),
  outstandingMinor: z.string(),
});
export const payablePageSchema = z.object({
  invoices: z.array(payableSchema),
  offset: z.number(),
  hasMore: z.boolean(),
  totals: z.array(
    z.object({ currency: currencySchema, payableMinor: z.string(), supplierOwesMinor: z.string() }),
  ),
});
export const payableDetailSchema = z.object({
  invoice: payableSchema,
  returns: z.array(z.object({ id: z.uuid(), quantity: z.string(), creditReference: z.string() })),
  events: z.array(
    z.object({
      id: z.uuid(),
      kind: z.enum(['credit', 'payment', 'refund']),
      amountMinor: z.string(),
      reference: z.string(),
      reason: z.string(),
      actorId: z.uuid(),
      createdAt: z.string(),
      returnId: z.uuid().nullable(),
      shiftId: z.uuid().nullable(),
    }),
  ),
  offset: z.number(),
  hasMore: z.boolean(),
});
export type SupplierSettlement = z.infer<typeof supplierSettlementSchema>;
export type SupplierCredit = z.infer<typeof supplierCreditSchema>;
export type PayableQuery = z.infer<typeof payableQuerySchema>;
export type Payable = z.infer<typeof payableSchema>;
