import { useState } from 'react';
import { View } from 'react-native';
import { Action } from './Controls';
import { NativeIcon } from './NativeIcon';
import { TextInput, Text } from './Themed';
import { IconAction } from './IconAction';
import { useTheme } from '../theme';
export function SearchControl({
  label,
  value,
  onChange,
  suggestions = [],
  onSelect,
  action,
  disabled = false,
  busy = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (value: string) => void;
  action?: { label: string; onSelect: () => void } | undefined;
  suggestions?: { value: string; label: string }[];
  disabled?: boolean;
  busy?: boolean;
}) {
  const theme = useTheme(),
    [suggest, setSuggest] = useState(false);
  const [previous, setPrevious] = useState(value);
  if (previous !== value) {
    setPrevious(value);
    setSuggest(!!value);
  }
  return (
    <View style={{ gap: theme.spacing.small }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.controlRadius,
          backgroundColor: theme.colors.card,
          paddingHorizontal: theme.spacing.small,
        }}
      >
        <NativeIcon name="search" />
        <TextInput
          accessibilityLabel={label}
          placeholder={label}
          value={value}
          editable={!disabled}
          maxLength={120}
          onFocus={() => setSuggest(true)}
          onChangeText={(text) => {
            onChange(text);
            setSuggest(true);
          }}
          style={{ flex: 1, minWidth: 0, borderWidth: 0, backgroundColor: 'transparent' }}
        />
        {Boolean(value) && (
          <IconAction
            label="Clear search"
            icon="×"
            disabled={disabled}
            onPress={() => {
              onChange('');
              setSuggest(false);
            }}
          />
        )}
      </View>
      {suggest && (
        <View
          style={{
            borderRadius: theme.radius,
            padding: theme.spacing.small,
            backgroundColor: theme.tokens.muted,
          }}
        >
          {action && !busy && (
            <Action
              label={action.label}
              variant="ghost"
              onPress={() => {
                action.onSelect();
                setSuggest(false);
              }}
            />
          )}
          {busy ? (
            <Text accessibilityLiveRegion="polite">Searching…</Text>
          ) : suggestions.length ? (
            suggestions.slice(0, 8).map((item) => (
              <Action
                key={item.value}
                label={item.label}
                variant="ghost"
                onPress={() => {
                  (onSelect ?? onChange)(item.value);
                  setSuggest(false);
                }}
              />
            ))
          ) : (
            <Text>
              {value ? 'No matches. Try another name or code.' : 'Type a name or code to search.'}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
