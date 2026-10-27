import { nonnegativeMinorSchema } from '@inventory/contracts';
/** Presentation of the existing cash + unpaid customer credit checkout, not a new tender. */
export function paymentAllocation(
  total: string,
  applied: string,
  received: string,
  hasCustomer: boolean,
) {
  if (![total, applied, received].every((v) => nonnegativeMinorSchema.safeParse(v).success))
    return { error: 'Enter nonnegative whole amounts in currency minor units.' } as const;
  const t = BigInt(total),
    a = BigInt(applied),
    r = BigInt(received);
  if (a > t) return { error: 'Cash applied cannot exceed the total.' } as const;
  if (r < a) return { error: 'Cash tendered must cover the cash applied.' } as const;
  if (a < t && !hasCustomer)
    return { error: 'Select a customer for the unpaid credit balance.' } as const;
  if (a === 0n && r !== 0n)
    return { error: 'A full-credit sale must have zero cash tendered.' } as const;
  return {
    cash: applied,
    credit: (t - a).toString(),
    change: (r - a).toString(),
    error: '',
  } as const;
}
