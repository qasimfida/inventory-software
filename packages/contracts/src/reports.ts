import { z } from 'zod';
export const reportSectionSchema = z.enum([
  'sales',
  'purchases',
  'payments',
  'receivables',
  'payables',
  'inventory',
  'movements',
]);
export const reportQuerySchema = z
  .object({
    section: reportSectionSchema,
    from: z.iso.date(),
    to: z.iso.date(),
    warehouseId: z.uuid().optional(),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
    lowOnly: z.enum(['true', 'false']).default('false'),
  })
  .strict()
  .refine((v) => {
    const days = (Date.parse(v.to) - Date.parse(v.from)) / 86400000;
    return days >= 0 && days < 366;
  }, 'Use an ordered date range of at most 366 UTC days');
const amount = z.string().regex(/^-?\d+(\.\d+)?$/);
export const reportRowSchema = z
  .object({
    key: z.string(),
    label: z.string(),
    value: amount,
    unit: z.string(),
  })
  .strict();
export const reportSchema = z
  .object({
    section: reportSectionSchema,
    from: z.iso.date(),
    to: z.iso.date(),
    asOf: z.iso.datetime(),
    rows: z.array(reportRowSchema).max(50),
    offset: z.number().int(),
    hasMore: z.boolean(),
    notes: z.array(z.string()),
  })
  .strict();
export type ReportQuery = z.infer<typeof reportQuerySchema>;
export type Report = z.infer<typeof reportSchema>;
