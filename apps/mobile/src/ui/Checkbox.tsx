import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '../theme';
import { metrics } from './metrics';
/** Native selection equivalent; preferences continue to use switches. */
export function Checkbox({
  label,
  value,
  onChange,
  disabled = false,
  compact = false,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /** Circular icon-only control for selection overlays; accessible label is retained. */
  compact?: boolean;
}) {
  const theme = useTheme(),
    [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={(event) => {
        event.stopPropagation();
        onChange(!value);
      }}
      style={{
        minHeight: metrics.target,
        minWidth: metrics.target,
        justifyContent: compact ? 'center' : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.small,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          width: compact ? 24 : 20,
          height: compact ? 24 : 20,
          borderWidth: metrics.border,
          borderColor: theme.colors.primary,
          borderRadius: theme.preferences.radius === 'circle' ? 12 : 4,
          backgroundColor: value ? theme.colors.primary : theme.colors.card,
          alignItems: 'center',
          justifyContent: 'center',
          outlineWidth: focused ? 2 : 0,
          outlineColor: theme.colors.primary,
        }}
      >
        {value && <Text style={{ color: theme.colors.onPrimary }}>✓</Text>}
      </View>
      {!compact && <Text style={{ flexShrink: 1 }}>{label}</Text>}
    </Pressable>
  );
}
