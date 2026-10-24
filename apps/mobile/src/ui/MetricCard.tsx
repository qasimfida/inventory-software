import { metrics } from './metrics';
import { StyleSheet, View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '../theme';
export function MetricCard({
  label,
  value,
  unit,
  primary = false,
  contained = false,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  primary?: boolean;
  /** Use when the card fills an interactive wrapper instead of a wrapping metric row. */
  contained?: boolean;
  /** Semantic tint; primary cards retain their primary surface. */
  tone?: 'success' | 'warning' | 'destructive' | undefined;
}) {
  const theme = useTheme();
  const color = primary ? theme.colors.onPrimary : theme.colors.foreground;
  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: contained ? undefined : 220,
        minWidth: 0,
        gap: theme.spacing.small,
        padding: theme.spacing.large,
        borderRadius: parseFloat(theme.tokens['surface-radius']),
        backgroundColor: primary
          ? theme.colors.primary
          : tone
            ? theme.colors.card
            : theme.tokens.muted,
      }}
    >
      {tone && !primary && (
        <View
          pointerEvents="none"
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: parseFloat(theme.tokens['surface-radius']),
              backgroundColor: theme.tokens[tone],
              opacity: 0.08,
            },
          ]}
        />
      )}
      <Text style={{ color }}>{label}</Text>
      <Text
        style={{ color, fontSize: metrics.title, fontWeight: '600', fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text style={{ color, fontSize: metrics.label }}>{unit}</Text>
    </View>
  );
}
