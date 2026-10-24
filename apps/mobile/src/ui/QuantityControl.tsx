import { View } from 'react-native';
import { stepQuantity } from '@inventory/api-client';
import { Text, TextInput } from './Themed';
import { IconAction } from './IconAction';
import { useTheme } from '../theme';
export function QuantityControl({
  label,
  compact = false,
  value,
  disabled = false,
  onChange,
}: {
  label: string;
  compact?: boolean;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const theme = useTheme(),
    less = stepQuantity(value, -1),
    more = stepQuantity(value, 1);
  return (
    <View style={compact ? { width: '100%' } : undefined}>
      {!compact && <Text>{label}</Text>}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: compact ? 0 : theme.spacing.small,
        }}
      >
        <IconAction
          smallIcon={compact}
          filled
          label={`Decrease ${label}`}
          icon="−"
          disabled={disabled || less === null}
          onPress={() => less && onChange(less)}
        />
        <TextInput
          accessibilityLabel={label}
          value={value}
          keyboardType="decimal-pad"
          editable={!disabled}
          onChangeText={onChange}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'center',
            borderWidth: 0,
            backgroundColor: 'transparent',
          }}
        />
        <IconAction
          smallIcon={compact}
          filled
          label={`Increase ${label}`}
          icon="+"
          disabled={disabled || more === null}
          onPress={() => more && onChange(more)}
        />
      </View>
    </View>
  );
}
