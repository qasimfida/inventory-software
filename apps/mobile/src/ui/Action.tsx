import { NativeIcon } from './NativeIcon';
import { useState } from 'react';
import type { ComponentRef, Ref } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTheme } from '../theme';
import { metrics } from './metrics';
import { Text } from './Themed';

export function Action({
  ref,
  label,
  accessibilityLabel = label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'default',
  icon,
}: {
  ref?: Ref<ComponentRef<typeof View>>;
  label: string;
  icon?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'default' | 'contrast' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const unavailable = disabled || loading;
  const color = unavailable
    ? theme.tokens['disabled-foreground']
    : variant === 'contrast'
      ? theme.colors.background
      : variant === 'default'
        ? theme.colors.onPrimary
        : variant === 'destructive'
          ? theme.tokens['destructive-foreground']
          : variant === 'secondary'
            ? theme.tokens['secondary-foreground']
            : variant === 'link'
              ? theme.colors.primary
              : theme.colors.foreground;
  const background = unavailable
    ? theme.tokens.disabled
    : variant === 'contrast'
      ? theme.colors.foreground
      : variant === 'default'
        ? theme.colors.primary
        : variant === 'destructive'
          ? theme.tokens.destructive
          : variant === 'secondary'
            ? theme.tokens.secondary
            : variant === 'outline'
              ? theme.colors.card
              : 'transparent';
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: unavailable, busy: loading }}
      aria-busy={loading}
      disabled={unavailable}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: metrics.target,
        padding: theme.spacing.small + metrics.unit,
        marginVertical: metrics.unit,
        borderRadius: theme.controlRadius,
        outlineWidth: focused ? metrics.focusWidth : 0,
        outlineColor: theme.colors.primary,
        outlineOffset: metrics.focusOffset,
        borderWidth: metrics.border,
        borderColor: focused
          ? theme.colors.primary
          : pressed
            ? color
            : variant === 'outline'
              ? theme.colors.border
              : 'transparent',
        backgroundColor: background,
        flexDirection: 'row',
        gap: theme.spacing.small,
        justifyContent: 'center',
        alignItems: 'center',
      })}
    >
      {icon && <NativeIcon name={icon} color={color} />}
      <Text
        style={{
          color,
          fontWeight: metrics.strong,
          opacity: loading ? 0 : 1,
          textDecorationLine: variant === 'link' ? 'underline' : 'none',
        }}
      >
        {label}
      </Text>
      {loading && (
        <View
          pointerEvents="none"
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute' }}
        >
          {theme.preferences.motion === 'enabled' ? (
            <ActivityIndicator color={color} />
          ) : (
            <Text style={{ color }}>…</Text>
          )}
        </View>
      )}
    </Pressable>
  );
}
