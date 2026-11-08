import { useDisplayMoney } from './useDisplayMoney';
import { Text } from './Themed';
export function CurrencyNotice() {
  return (
    <Text tone="muted" accessibilityLabel="Display currency information">
      {useDisplayMoney().notice}
    </Text>
  );
}
