import { formatMinorUnits as originalAmount } from '@inventory/domain';
import { useDisplayMoney } from '@/theme/useDisplayMoney';

import { businessTime } from '@inventory/contracts';
export function MoneyValue({
  amount,
  currency,
  original = false,
}: {
  amount: string;
  currency: string;
  original?: boolean;
}) {
  const { formatMinorUnits } = useDisplayMoney();

  return (
    <span className="tabular-nums [overflow-wrap:anywhere]">
      {original ? originalAmount(amount, currency) : formatMinorUnits(amount, currency)}
    </span>
  );
}
export function BusinessDate({ value, timeZone = 'UTC' }: { value: string; timeZone?: string }) {
  return <time dateTime={value}>{businessTime(value, timeZone)}</time>;
}
