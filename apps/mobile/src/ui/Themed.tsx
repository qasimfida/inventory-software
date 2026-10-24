import { useState } from 'react';
import { metrics } from './metrics';
import { Text as NativeText, StyleSheet, TextInput as NativeInput } from 'react-native';
import type { TextProps, TextInputProps } from 'react-native';
import { useTheme } from '../theme';

export function Text({
  style,
  tone,
  ...props
}: TextProps & { tone?: 'default' | 'error' | 'muted' | 'success' | 'warning' | 'info' }) {
  const theme = useTheme();
  const effectiveTone = tone ?? (props.accessibilityRole === 'alert' ? 'error' : 'default');
  return (
    <NativeText
      {...props}
      accessibilityLiveRegion={
        props.accessibilityLiveRegion ??
        (props.accessibilityRole === 'alert' ? 'assertive' : undefined)
      }
      style={[
        {
          fontFamily: theme.fontFamily,
          fontSize: metrics.body,
          lineHeight: metrics.lineHeight,
          color:
            effectiveTone === 'error'
              ? theme.colors.error
              : effectiveTone === 'muted'
                ? theme.colors.muted
                : effectiveTone === 'default'
                  ? theme.colors.foreground
                  : theme.tokens[effectiveTone],
        },
        theme.preferences.states === 'enhanced' &&
          props.accessibilityRole === 'alert' && {
            borderWidth: 1,
            borderColor: theme.colors.error,
            padding: theme.spacing.medium,
            borderRadius: theme.radius,
          },
        style,
        {
          fontSize:
            (StyleSheet.flatten(style)?.fontSize ?? metrics.body) *
            (theme.preferences.textSize === 'large'
              ? 1.2
              : theme.preferences.textSize === 'small'
                ? 0.9
                : 1),
          lineHeight:
            (StyleSheet.flatten(style)?.lineHeight ??
              (StyleSheet.flatten(style)?.fontSize ?? metrics.body) *
                parseFloat(theme.tokens['line-body'])) *
            (theme.preferences.textSize === 'large'
              ? 1.2
              : theme.preferences.textSize === 'small'
                ? 0.9
                : 1),
        },
      ]}
    />
  );
}
export function TextInput({
  style,
  invalid = false,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { invalid?: boolean }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <NativeInput
      placeholderTextColor={theme.colors.muted}
      {...props}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      style={[
        {
          color: theme.colors.foreground,
          backgroundColor: theme.colors.card,
          borderColor: theme.colors.border,
          borderWidth: metrics.border,
          borderRadius: props.multiline ? theme.radius : theme.controlRadius,
          minHeight: metrics.target,
          padding: metrics.unit * 3,
          fontFamily: theme.fontFamily,
          fontSize: metrics.body,
        },
        style,
        {
          fontSize:
            (StyleSheet.flatten(style)?.fontSize ?? metrics.body) *
            (theme.preferences.textSize === 'large'
              ? 1.2
              : theme.preferences.textSize === 'small'
                ? 0.9
                : 1),
          lineHeight:
            (StyleSheet.flatten(style)?.lineHeight ??
              (StyleSheet.flatten(style)?.fontSize ?? metrics.body) *
                parseFloat(theme.tokens['line-body'])) *
            (theme.preferences.textSize === 'large'
              ? 1.2
              : theme.preferences.textSize === 'small'
                ? 0.9
                : 1),
        },
        props.multiline && { minHeight: metrics.target * 2, textAlignVertical: 'top' },
        props.readOnly && { backgroundColor: theme.tokens.muted },
        {
          borderColor: invalid
            ? theme.colors.error
            : focused
              ? theme.colors.primary
              : theme.tokens.input,
        },
        props.editable === false &&
          !props.readOnly && {
            color: theme.tokens['disabled-foreground'],
            backgroundColor: theme.tokens.disabled,
          },
      ]}
    />
  );
}
