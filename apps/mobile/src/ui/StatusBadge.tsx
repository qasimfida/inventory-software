import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Themed';
/** Compact native status label; meaning is always expressed in text as well as color. */
export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'error' | 'info';
}) {
  const theme = useTheme();
  const color =
    tone === 'neutral'
      ? theme.colors.muted
      : tone === 'error'
        ? theme.colors.error
        : theme.tokens[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        maxWidth: '100%',
        borderRadius: theme.controlRadius,
        borderWidth: 1,
        borderColor: color,
        backgroundColor:
          tone === 'warning'
            ? theme.tokens['warning-surface']
            : tone === 'error'
              ? theme.tokens['error-surface']
              : 'transparent',
        paddingHorizontal: theme.spacing.small,
      }}
    >
      <View
        pointerEvents="none"
        accessible={false}
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: color, opacity: 0.08, borderRadius: theme.controlRadius },
        ]}
      />
      <Text tone={tone === 'neutral' ? 'muted' : tone}>{label}</Text>
    </View>
  );
}
