import { z } from 'zod';
import { currencySchema, operationKeySchema } from './conventions.js';
export const nonnegativeMinorSchema = z.string().regex(/^(?:0|[1-9][0-9]{0,23})$/);
export const positiveMinorSchema = z.string().regex(/^[1-9][0-9]{0,23}$/);
export const customerInputSchema = z
  .object({
    storeId: z.uuid(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{1,40}$/),
    name: z.string().trim().min(1).max(120),
    email: z
      .union([z.email(), z.literal('')])
      .default('')
      .transform((v) => v.toLowerCase()),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+?[0-9]{7,18})?$/)
      .default(''),
    address: z.string().trim().max(500).default(''),
    notes: z.string().trim().max(1000).default(''),
    currency: currencySchema,
    state: z.enum(['active', 'inactive', 'archived']).default('active'),
  })
  .strict();
export const customerUpdateSchema = customerInputSchema.extend({
  version: z.number().int().positive(),
});
export const customerCreditSchema = z
  .object({
    creditEnabled: z.boolean(),
    creditHold: z.boolean(),
    creditLimitMinor: nonnegativeMinorSchema,
    termsDays: z.number().int().min(0).max(365),
    version: z.number().int().positive(),
  })
  .strict();
export const customerSchema = customerInputSchema.extend({
  id: z.uuid(),
  version: z.number().int(),
  creditEnabled: z.boolean(),
  creditHold: z.boolean(),
  creditLimitMinor: nonnegativeMinorSchema,
  termsDays: z.number().int(),
  anonymized: z.boolean(),
});
export const customerQuerySchema = z
  .object({
    storeId: z.uuid(),
    state: z.enum(['active', 'inactive', 'archived']).optional(),
    currency: currencySchema.optional(),
    search: z.string().trim().max(120).default(''),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const customerPageSchema = z.object({
  customers: z.array(customerSchema),
  hasMore: z.boolean(),
  offset: z.number(),
});
export const customerPaymentSchema = z
  .object({
    receivableId: z.uuid(),
    amountMinor: positiveMinorSchema,
    reference: z.string().trim().min(1).max(120),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const customerStatementSchema = z.object({
  customerId: z.uuid(),
  currency: currencySchema,
  outstandingMinor: nonnegativeMinorSchema,
  hasMore: z.boolean(),
  receivables: z.array(
    z.object({
      id: z.uuid(),
      saleId: z.uuid(),
      warehouseId: z.uuid(),
      amountMinor: positiveMinorSchema,
      outstandingMinor: nonnegativeMinorSchema,
      dueDate: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
  payments: z.array(
    z.object({
      id: z.uuid(),
      amountMinor: positiveMinorSchema,
      reference: z.string(),
      createdAt: z.iso.datetime(),
    }),
  ),
  credits: z.array(
    z.object({
      id: z.uuid(),
      sourceId: z.uuid(),
      amountMinor: positiveMinorSchema,
      createdAt: z.iso.datetime(),
    }),
  ),
  refunds: z.array(
    z.object({
      id: z.uuid(),
      sourceId: z.uuid(),
      amountMinor: positiveMinorSchema,
      createdAt: z.iso.datetime(),
    }),
  ),
});
export const retentionSchema = z
  .object({
    inactiveDays: z.number().int().min(30).max(36500),
    version: z.number().int().positive(),
  })
  .strict();
export type CustomerInput = z.infer<typeof customerInputSchema>;
export type CustomerCredit = z.infer<typeof customerCreditSchema>;
export type CustomerQuery = z.infer<typeof customerQuerySchema>;
export type Customer = z.infer<typeof customerSchema>;
export type CustomerPayment = z.infer<typeof customerPaymentSchema>;
