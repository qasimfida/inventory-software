import { z } from 'zod';
import { currencySchema, operationKeySchema } from './conventions.js';
import { positiveMinorSchema, nonnegativeMinorSchema } from './customers.js';
export const staffInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{1,40}$/),
    storeId: z.uuid().nullable(),
    title: z.string().trim().max(120),
    salaryMinor: nonnegativeMinorSchema,
    currency: currencySchema,
    state: z.enum(['active', 'inactive']),
  })
  .strict();
export const staffSchema = staffInputSchema.extend({
  id: z.uuid(),
  version: z.number().int().positive(),
});
export const staffUpdateSchema = staffInputSchema.extend({ version: z.number().int().positive() });
export const costInputSchema = z
  .object({
    kind: z.enum(['salary', 'expense']),
    staffId: z.uuid().nullable(),
    storeId: z.uuid().nullable(),
    description: z.string().trim().min(1).max(500),
    reference: z.string().trim().min(1).max(120),
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
    amountMinor: positiveMinorSchema,
    currency: currencySchema,
    idempotencyKey: operationKeySchema,
  })
  .strict()
  .refine((v) => v.periodEnd >= v.periodStart, 'End date must follow start date')
  .refine(
    (v) => (v.kind === 'salary') === (v.staffId !== null),
    'Salary requires a staff record; expenses do not',
  );
export const costPaymentSchema = z
  .object({
    amountMinor: positiveMinorSchema,
    reference: z.string().trim().min(1).max(120),
    paidOn: z.iso.date(),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const operationQuerySchema = z
  .object({
    search: z.string().trim().max(120).default(''),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const costSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['salary', 'expense']),
  staffId: z.uuid().nullable(),
  storeId: z.uuid().nullable(),
  description: z.string(),
  reference: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  amountMinor: positiveMinorSchema,
  currency: currencySchema,
  paidMinor: nonnegativeMinorSchema,
});
export const operationsPageSchema = z.object({
  staff: z.array(staffSchema),
  costs: z.array(costSchema),
  staffHasMore: z.boolean(),
  costsHasMore: z.boolean(),
});
export type StaffInput = z.infer<typeof staffInputSchema>;
export type Staff = z.infer<typeof staffSchema>;
export type CostInput = z.infer<typeof costInputSchema>;
export type CostPayment = z.infer<typeof costPaymentSchema>;
export type OperationsPage = z.infer<typeof operationsPageSchema>;

export const costDetailSchema = z.object({
  cost: costSchema,
  payments: z.array(
    z.object({
      id: z.uuid(),
      amountMinor: positiveMinorSchema,
      reference: z.string(),
      paidOn: z.string(),
    }),
  ),
  hasMore: z.boolean(),
});
