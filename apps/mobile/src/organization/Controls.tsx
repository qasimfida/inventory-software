import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from '../theme';
export function Action({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={styles.button}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  disabled = false,
  maxLength = 254,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  multiline?: boolean;
}) {
  return (
    <View style={styles.group}>
      <Text>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        editable={!disabled}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={maxLength}
        multiline={multiline}
        style={styles.input}
      />
    </View>
  );
}
export function Choice({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.group}>
      <Text>{label}</Text>
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityLabel={`${label}: ${option.label}`}
          accessibilityState={{ checked: option.value === value, disabled }}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          style={styles.choice}
        >
          <Text>
            {option.value === value ? '● ' : '○ '}
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
export const choices = (values: string[]) => values.map((value) => ({ value, label: value }));
export const styles = StyleSheet.create({
  group: { gap: 8, marginVertical: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.muted,
    padding: 12,
    borderRadius: 8,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 12,
    minHeight: 48,
    borderRadius: 8,
    justifyContent: 'center',
    marginVertical: 4,
  },
  buttonText: { color: theme.colors.onPrimary },
  choice: {
    padding: 12,
    minHeight: 44,
    borderWidth: 1,
    borderColor: theme.colors.muted,
    borderRadius: 8,
  },
  heading: { fontSize: 22, fontWeight: '600' },
  error: { color: theme.colors.error },
});
