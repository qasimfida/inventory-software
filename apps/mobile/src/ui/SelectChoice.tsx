import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from './Themed';
import { SidePanel } from './SidePanel';
import { useTheme } from '../theme';
export function SelectChoice({
  label,
  value,
  options,
  onChange,
  disabled = false,
  searchable,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const theme = useTheme(),
    [open, setOpen] = useState(false),
    [search, setSearch] = useState('');
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open, disabled }}
        disabled={disabled}
        onPress={() => {
          setSearch('');
          setOpen(true);
        }}
        style={{
          minHeight: parseFloat(theme.tokens['native-target-size']),
          padding: theme.spacing.small * 1.5,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.controlRadius,
          backgroundColor: disabled ? theme.tokens.disabled : theme.colors.card,
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: theme.spacing.small,
        }}
      >
        <Text style={{ flex: 1 }}>
          {options.find((o) => o.value === value)?.label ?? 'Select…'}
        </Text>
        <Text accessible={false}>⌄</Text>
      </Pressable>
      <SidePanel title={label} open={open} onClose={() => setOpen(false)}>
        {(searchable ?? options.length > 7) && (
          <TextInput
            accessibilityLabel={`Search ${label} options`}
            placeholder="Search options…"
            value={search}
            onChangeText={setSearch}
          />
        )}
        {!options.some((o) => o.label.toLowerCase().includes(search.toLowerCase())) && (
          <Text accessibilityLiveRegion="polite">No matching options.</Text>
        )}
        {options
          .filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
          .map((option) => (
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
              onPress={() => {
                onChange(option.value);
                setOpen(false);
              }}
              style={{
                minHeight: parseFloat(theme.tokens['native-target-size']),
                padding: theme.spacing.small * 1.5,
                borderRadius: theme.controlRadius,
                backgroundColor: option.value === value ? theme.tokens.selected : theme.colors.card,
              }}
            >
              <Text tone={option.disabled ? 'muted' : 'default'}>
                {option.value === value ? '✓ ' : ''}
                {option.label}
              </Text>
            </Pressable>
          ))}
      </SidePanel>
    </View>
  );
}
