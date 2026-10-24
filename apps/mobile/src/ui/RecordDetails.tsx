import { metrics } from './metrics';
import { View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '../theme';

export function RecordDetails({
  label,
  items,
}: {
  label: string;
  items: { label: string; value: string }[];
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={{
        gap: theme.spacing.medium,
        paddingVertical: theme.spacing.medium,
        borderBottomWidth: metrics.border,
        borderColor: theme.tokens.border,
      }}
    >
      {items.map((item, index) => (
        <View key={`${item.label}-${index}`} style={{ gap: theme.spacing.small / 2 }}>
          <Text tone="muted" style={{ fontSize: Number.parseFloat(theme.tokens['font-label']) }}>
            {item.label}
          </Text>
          <Text style={{ fontVariant: ['tabular-nums'] }}>{item.value}</Text>
        </View>
      ))}
    </View>
  );
}
