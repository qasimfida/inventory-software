import { NativeIcon } from './NativeIcon';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from './Themed';
import { metrics } from './metrics';
import { useTheme } from '../theme';
/** Native glyph controls; labels and long-press hints never depend on hover. */
export function IconAction({
  label,
  icon,
  onPress,
  disabled = false,
  filled = false,
  smallIcon = false,
}: {
  label: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  filled?: boolean;
  smallIcon?: boolean;
}) {
  const theme = useTheme(),
    [hint, setHint] = useState(false),
    [focus, setFocus] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onHoverIn={() => setHint(true)}
        onHoverOut={() => setHint(false)}
        onLongPress={() => setHint(true)}
        onPressOut={() => setHint(false)}
        style={({ pressed }) => ({
          minWidth: metrics.target,
          minHeight: metrics.target,
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: theme.controlRadius,
          backgroundColor: pressed
            ? theme.tokens.selected
            : filled
              ? theme.tokens.secondary
              : 'transparent',
          opacity: disabled ? 0.5 : 1,
          outlineWidth: focus ? metrics.focusWidth : 0,
          outlineColor: theme.colors.primary,
        })}
      >
        {icon === 'eye' || icon === 'eye-off' ? (
          <View
            style={{
              width: theme.iconSize,
              height: theme.iconSize * 0.65,
              borderWidth: metrics.border,
              borderColor: theme.colors.foreground,
              borderRadius: metrics.radius,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: metrics.small,
                height: metrics.small,
                borderRadius: metrics.radius,
                backgroundColor: theme.colors.foreground,
              }}
            />
            {icon === 'eye-off' && (
              <View
                style={{
                  position: 'absolute',
                  width: theme.iconSize,
                  height: metrics.border,
                  backgroundColor: theme.colors.foreground,
                  transform: [{ rotate: '-45deg' }],
                }}
              />
            )}
          </View>
        ) : (
          <NativeIcon name={icon} small={smallIcon} />
        )}
      </Pressable>
      {hint && (
        <Text accessibilityLiveRegion="polite" style={{ fontSize: metrics.label }}>
          {label}
        </Text>
      )}
    </View>
  );
}
