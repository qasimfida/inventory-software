import { formatMinorUnits } from '@inventory/domain';
import { businessTime } from '@inventory/contracts';
export function MoneyValue({ amount, currency }: { amount: string; currency: string }) {
  return (
    <span className="font-mono tabular-nums [overflow-wrap:anywhere]">
      {formatMinorUnits(amount, currency)}
    </span>
  );
}
export function BusinessDate({ value, timeZone = 'UTC' }: { value: string; timeZone?: string }) {
  return <time dateTime={value}>{businessTime(value, timeZone)}</time>;
}
