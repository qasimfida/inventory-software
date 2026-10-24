import { SelectChoice } from './SelectChoice';
import { useId, useState } from 'react';
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
  description,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  multiline?: boolean;
  readOnly?: boolean;
  description?: string;
  error?: string;
}) {
  const theme = useTheme();
  const id = useId();
  return (
    <View style={[styles.group, { gap: theme.spacing.small, marginVertical: theme.spacing.small }]}>
      <Text>{label}</Text>
      <TextInput
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
        style={[styles.input, { padding: theme.spacing.small + metrics.unit }]}
      />
      {Boolean(description) && (
        <Text nativeID={`${id}-hint`} tone="muted">
          {description}
        </Text>
      )}
      {Boolean(error) && (
        <Text nativeID={`${id}-error`} tone="error" accessibilityRole="alert">
          {error}
        </Text>
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
                outlineColor: theme.colors.primary,
                borderColor: pressed ? theme.colors.primary : theme.colors.border,
                padding: theme.spacing.small + metrics.unit,
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
    borderRadius: metrics.radius,
  },
  choice: {
    padding: metrics.unit * 3,
    minHeight: metrics.target,
    borderWidth: metrics.border,
    borderRadius: metrics.radius,
  },
  heading: { fontSize: metrics.heading, fontWeight: metrics.strong },
});
