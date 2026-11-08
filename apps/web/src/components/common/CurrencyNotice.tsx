import { useDisplayMoney } from '@/theme/useDisplayMoney';
export function CurrencyNotice() {
  return (
    <p className="text-xs text-muted-foreground mb-3" aria-label="Display currency information">
      {useDisplayMoney().notice}
    </p>
  );
}
