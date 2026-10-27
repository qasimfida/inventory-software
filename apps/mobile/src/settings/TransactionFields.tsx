import { currencySchema } from '@inventory/contracts';
import type { CompanyProfile } from '@inventory/contracts';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { Field, Choice } from '../ui/Controls';
import { SettingSwitch } from '../ui/SettingSwitch';
import { useTheme } from '../theme';
export function TransactionFields({
  profile,
  onChange,
  disabled,
}: {
  profile: CompanyProfile;
  onChange: (value: CompanyProfile) => void;
  disabled: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text accessibilityRole="header">Transaction defaults</Text>
      <Text>
        Defaults for new prices. Existing prices, taxes and historical amounts stay unchanged. This
        is not currency conversion.
      </Text>
      <Choice
        label="Default transaction currency"
        value={profile.transactionCurrency ?? ''}
        disabled={disabled}
        options={[
          { value: '', label: 'Not configured' },
          ...currencySchema.options.map((value) => ({ value, label: value })),
        ]}
        onChange={(value) =>
          onChange({
            ...profile,
            transactionCurrency: currencySchema.nullable().parse(value || null),
          })
        }
      />
      <Field
        label="Default tax rate (basis points; 100 = 1%)"
        value={profile.taxBasisPoints?.toString() ?? ''}
        disabled={disabled}
        onChange={(value) =>
          onChange({ ...profile, taxBasisPoints: value === '' ? null : Number(value) })
        }
      />
      <SettingSwitch
        label="Price includes tax"
        value={profile.taxInclusive}
        disabled={disabled}
        onChange={(taxInclusive) => onChange({ ...profile, taxInclusive })}
      />
    </View>
  );
}
