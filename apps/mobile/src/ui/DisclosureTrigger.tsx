import { useState } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Themed';
import { metrics } from './metrics';

/** Controlled presentation only: the caller retains expansion state and lazy loading. */
export function DisclosureTrigger({
  label,
  expanded,
  onPress,
  disabled = false,
}: {
  label: string;
  expanded: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ expanded, disabled }}
      aria-expanded={expanded}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => ({
        minHeight: metrics.target,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.small,
        paddingVertical: theme.spacing.small,
        borderBottomWidth: metrics.border,
        borderBottomColor: theme.tokens.border,
        backgroundColor: pressed ? theme.tokens.accent : 'transparent',
        outlineWidth: focused ? metrics.focusWidth : 0,
        outlineColor: theme.colors.primary,
        outlineOffset: metrics.focusOffset,
      })}
    >
      <Text
        style={{
          flexShrink: 1,
          fontWeight: '500',
          color: disabled ? theme.tokens['disabled-foreground'] : theme.colors.foreground,
        }}
      >
        {label}
      </Text>
      <Text
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        tone="muted"
      >
        {expanded ? '⌃' : '⌄'}
      </Text>
    </Pressable>
  );
}
