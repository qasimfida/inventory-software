import { SelectChoice } from './SelectChoice';
import { useId, useState, type ReactNode } from 'react';
import { metrics } from './metrics';
import { Text, TextInput } from './Themed';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';
export { Action } from './Action';
export function Field({
  label,
  value,
  onChange,
  disabled = false,
  maxLength = 254,
  multiline = false,
  readOnly = false,
  autoFocus = false,
  description,
  error,
  trailing,
  errorAccessory,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  multiline?: boolean;
  readOnly?: boolean;
  /** Focus only after an explicit user action, such as Fix field. */
  autoFocus?: boolean;
  description?: string;
  error?: string;
  /** Inline end affordance; the input reserves space so text never overlaps it. */
  trailing?: ReactNode;
  /** Optional help beside the error, only rendered when an error is present. */
  errorAccessory?: ReactNode;
}) {
  const theme = useTheme();
  const id = useId();
  return (
    <View
      style={[
        styles.group,
        {
          gap: theme.spacing.small,
          marginVertical: theme.spacing.small,
          zIndex: trailing || errorAccessory ? 2 : 0,
        },
      ]}
    >
      <Text>{label}</Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          autoFocus={autoFocus}
          accessibilityLabel={label}
          accessibilityHint={[description, error].filter(Boolean).join('. ') || undefined}
          {...(Platform.OS === 'web'
            ? {
                'aria-describedby':
                  [description ? `${id}-hint` : '', error ? `${id}-error` : '']
                    .filter(Boolean)
                    .join(' ') || undefined,
                'aria-invalid': Boolean(error),
              }
            : {})}
          readOnly={readOnly || undefined}
          invalid={Boolean(error)}
          value={value}
          onChangeText={onChange}
          editable={!disabled}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={maxLength}
          multiline={multiline}
          style={[
            styles.input,
            {
              padding: parseFloat(theme.tokens['control-padding']),
              ...(trailing ? { paddingRight: metrics.target + theme.spacing.small } : {}),
            },
          ]}
        />
        {trailing && (
          <View
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            {trailing}
          </View>
        )}
      </View>
      {Boolean(description) && (
        <Text nativeID={`${id}-hint`} tone="muted">
          {description}
        </Text>
      )}
      {Boolean(error) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.small,
          }}
        >
          <Text
            style={{ flexShrink: 1 }}
            nativeID={`${id}-error`}
            tone="error"
            accessibilityRole="alert"
          >
            {error}
          </Text>
          {errorAccessory}
        </View>
      )}
    </View>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  disabled = false,
  inline = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  inline?: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState<string>();
  if (!inline)
    return (
      <SelectChoice
        label={label}
        value={value}
        options={options}
        onChange={onChange}
        disabled={disabled}
      />
    );
  return (
    <View style={[styles.group, { gap: theme.spacing.small, marginVertical: theme.spacing.small }]}>
      <Text>{label}</Text>
      <View
        style={{
          gap: theme.spacing.small,
          flexDirection: inline ? 'row' : 'column',
          flexWrap: inline ? 'wrap' : 'nowrap',
        }}
      >
        {options.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${option.label}`}
            accessibilityState={{
              checked: option.value === value,
              disabled: disabled || !!option.disabled,
            }}
            aria-checked={option.value === value}
            disabled={disabled || option.disabled}
            onFocus={() => setFocused(option.value)}
            onBlur={() => setFocused(undefined)}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.choice,
              {
                borderRadius: theme.controlRadius,
                outlineWidth: focused === option.value ? metrics.focusWidth : 0,
                outlineOffset: metrics.focusOffset,
                outlineColor: theme.tokens.ring,
                borderColor: pressed ? theme.colors.primary : theme.colors.border,
                padding: parseFloat(theme.tokens['control-padding']),
                backgroundColor:
                  disabled || option.disabled
                    ? theme.tokens.disabled
                    : option.value === value
                      ? theme.tokens.selected
                      : theme.colors.card,
              },
            ]}
          >
            <Text
              style={{
                color:
                  disabled || option.disabled
                    ? theme.tokens['disabled-foreground']
                    : option.value === value
                      ? theme.tokens['selected-foreground']
                      : theme.colors.foreground,
              }}
            >
              {option.value === value ? '● ' : '○ '}
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export const choices = (values: string[]) => values.map((value) => ({ value, label: value }));
export const styles = StyleSheet.create({
  group: { gap: metrics.small, marginVertical: metrics.small },
  input: {
    minHeight: metrics.target,
    borderWidth: metrics.border,
    padding: metrics.unit * 3,
  },
  choice: {
    padding: metrics.unit * 3,
    minHeight: metrics.target,
    borderWidth: metrics.border,
  },
  heading: { fontSize: metrics.heading, fontWeight: metrics.strong },
});
