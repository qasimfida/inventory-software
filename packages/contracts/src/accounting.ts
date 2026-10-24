import { z } from 'zod';
import { operationKeySchema, currencySchema } from './conventions.js';
export const accountingAccounts = [
  { code: '1000', name: 'Cash', kind: 'asset' },
  { code: '1100', name: 'Customer settlement / receivable control', kind: 'asset' },
  { code: '2000', name: 'Supplier payable control', kind: 'liability' },
  { code: '2100', name: 'Sales tax payable', kind: 'liability' },
  { code: '3000', name: 'Opening equity', kind: 'equity' },
  { code: '4000', name: 'Sales revenue', kind: 'income' },
  { code: '4100', name: 'Sales returns', kind: 'expense' },
  { code: '5000', name: 'Purchases (unvalued inventory)', kind: 'expense' },
] as const;
const account = z.enum(['1000', '1100', '2000', '2100', '3000', '4000', '4100', '5000']);
const moneyPattern = /^(0|[1-9]\d{0,23})$/;
const amount = z.string().regex(moneyPattern);
const validSides = (l: { debit: string; credit: string }) =>
  moneyPattern.test(l.debit) && moneyPattern.test(l.credit);
const date = z.iso.date().refine((d) => d >= '1900-01-01' && d <= '9999-12-31');
export const journalLineSchema = z
  .object({ account, debit: amount, credit: amount })
  .strict()
  .refine(
    (l) => validSides(l) && BigInt(l.debit) > 0n !== BigInt(l.credit) > 0n,
    'Use exactly one positive side',
  );
export const periodDraftSchema = z
  .object({ from: date, to: date })
  .strict()
  .refine(
    (v) => v.from <= v.to && Date.parse(v.to) - Date.parse(v.from) <= 366 * 86400000,
    'Period must be ordered and at most 367 days',
  );
export const periodInputSchema = periodDraftSchema.safeExtend({
  idempotencyKey: operationKeySchema,
});
export const journalDraftSchema = z
  .object({
    date,
    currency: currencySchema,
    reason: z.string().trim().min(10).max(240),
    lines: z.array(journalLineSchema).min(2).max(50),
  })
  .strict()
  .refine(
    (v) =>
      v.lines.every(validSides) &&
      v.lines.reduce((n, l) => n + BigInt(l.debit) - BigInt(l.credit), 0n) === 0n,
    'Journal must balance',
  );
export const journalInputSchema = journalDraftSchema.safeExtend({
  idempotencyKey: operationKeySchema,
});
export const sourceKindSchema = z.enum([
  'sale',
  'sale_return',
  'cash_payment',
  'cash_refund',
  'supplier_invoice',
  'supplier_credit',
  'supplier_settlement',
]);
export const sourcePostSchema = z
  .object({ kind: sourceKindSchema, sourceId: z.uuid(), idempotencyKey: operationKeySchema })
  .strict();
export const accountingActionSchema = z
  .object({ reason: z.string().trim().min(10).max(240), idempotencyKey: operationKeySchema })
  .strict();
export const reversalSchema = accountingActionSchema.extend({ date });
export const accountingPeriodSchema = z.object({
  id: z.uuid(),
  from: date,
  to: date,
  state: z.enum(['open', 'closed']),
});
export const journalSchema = z.object({
  id: z.uuid(),
  date,
  currency: currencySchema,
  reason: z.string(),
  sourceKind: z.string(),
  sourceId: z.uuid().nullable(),
  reversalId: z.uuid().nullable(),
  lines: z.array(journalLineSchema),
  createdAt: z.string(),
});
export const accountingSourceSchema = z.object({
  kind: sourceKindSchema,
  id: z.uuid(),
  date,
  currency: currencySchema,
  amount: amount,
  net: amount,
  tax: amount,
  direction: z.enum(['payment', 'refund']),
});
export const accountingPageSchema = z.object({
  periods: z.array(accountingPeriodSchema).max(50),
  journals: z.array(journalSchema).max(50),
  pending: z.array(accountingSourceSchema).max(50),
  balances: z.array(
    z.object({
      account,
      currency: currencySchema,
      debit: z.string().regex(/^\d+$/),
      credit: z.string().regex(/^\d+$/),
    }),
  ),
  hasMore: z.boolean(),
  offset: z.number(),
});
export type JournalInput = z.infer<typeof journalInputSchema>;
export type JournalLine = z.infer<typeof journalLineSchema>;
export type AccountingSource = z.infer<typeof accountingSourceSchema>;
export type PeriodInput = z.infer<typeof periodInputSchema>;
export type SourcePost = z.infer<typeof sourcePostSchema>;
export type Reversal = z.infer<typeof reversalSchema>;
export type AccountingAction = z.infer<typeof accountingActionSchema>;
