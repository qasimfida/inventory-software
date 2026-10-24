import { View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '../theme';

/** A native alternative to table cells. Values and units remain exact, without truncation. */
export function DataRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        gap: theme.spacing.small,
        paddingVertical: theme.spacing.small,
        borderBottomWidth: 1,
        borderBottomColor: theme.tokens.border,
      }}
    >
      <Text style={{ fontWeight: '500' }}>{label}</Text>
      <Text style={{ fontVariant: ['tabular-nums'] }}>
        {value} {unit}
      </Text>
    </View>
  );
}
