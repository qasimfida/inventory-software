import { z } from 'zod';
import { positiveQuantitySchema, operationKeySchema } from './conventions.js';
export const saleReturnSchema = z
  .object({
    kind: z.enum(['return', 'exchange', 'void']),
    reasonCode: z.enum(['unwanted', 'defective', 'incorrect', 'cancellation']),
    note: z.string().trim().min(3).max(240),
    lines: z
      .array(
        z
          .object({
            saleLineId: z.uuid(),
            quantity: positiveQuantitySchema,
            disposition: z.enum(['restock', 'damaged', 'non_restockable']),
          })
          .strict(),
      )
      .min(1)
      .max(50),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const returnResultSchema = z.object({
  id: z.uuid(),
  totalMinor: z.string(),
  creditMinor: z.string(),
  cashRefundMinor: z.string(),
});
export type SaleReturn = z.infer<typeof saleReturnSchema>;
