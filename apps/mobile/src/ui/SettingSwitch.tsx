import { Switch, View } from 'react-native';
import { Text } from './Themed';
import { useTheme } from '../theme';
import { metrics } from './metrics';
/** Native equivalent of the web Switch; controlled by the existing settings model. */
export function SettingSwitch({
  label,
  description,
  value,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.medium,
        minHeight: metrics.target,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text>{label}</Text>
        {Boolean(description) && <Text tone="muted">{description}</Text>}
      </View>
      <Switch
        accessibilityLabel={label}
        accessibilityHint={description}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: theme.tokens.input, true: theme.colors.primary }}
      />
    </View>
  );
}
