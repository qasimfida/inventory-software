import { z } from 'zod';
export const identifierSchema = z.uuid();
export const decimalSchema = z.string().regex(/^(?:0|[1-9][0-9]{0,17})(?:\.[0-9]{1,6})?$/);
export const positiveQuantitySchema = decimalSchema.refine(
  (value) => /[1-9]/.test(value),
  'Quantity must be positive',
);
export const currencySchema = z.enum(['USD', 'EUR', 'GBP', 'PKR', 'JPY', 'KWD', 'CLF']);
export const minorAmountSchema = z.string().regex(/^-?(?:0|[1-9][0-9]{0,23})$/);
export const timeZoneSchema = z
  .string()
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, 'Invalid IANA time zone');
export const pageQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
    search: z.string().trim().max(120).default(''),
    sort: z.enum(['name', 'createdAt']).default('name'),
    direction: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();
export const operationKeySchema = z.uuid();
export function businessTime(value: string, timeZone = 'UTC') {
  return (
    new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(new Date(value)) + ` (${timeZone})`
  );
}
