import { useDisplayMoney } from '../ui/useDisplayMoney';
import { Text } from '../ui/Themed';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { RecordDetails } from '../ui/RecordDetails';
import type { Customer } from '@inventory/contracts';
export function CustomerProfile({ customer, store }: { customer: Customer; store: string }) {
  const { formatMinorUnits } = useDisplayMoney();

  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">Customer profile</Text>
      <RecordDetails
        label="Customer profile"
        items={[
          { label: 'Name', value: customer.name },
          { label: 'Customer code', value: customer.code },
          { label: 'Store', value: store },
          { label: 'Status', value: customer.state },
          { label: 'Email', value: customer.email || 'Not provided' },
          { label: 'Phone', value: customer.phone || 'Not provided' },
          { label: 'Address', value: customer.address || 'Not provided' },
          { label: 'Notes', value: customer.notes || 'None' },
          {
            label: 'Privacy',
            value: customer.anonymized ? 'Profile anonymized' : 'Profile retained',
          },
        ]}
      />
      <Text accessibilityRole="header">Credit policy</Text>
      <RecordDetails
        label="Credit policy"
        items={[
          { label: 'Credit eligible', value: customer.creditEnabled ? 'Yes' : 'No' },
          { label: 'Credit hold', value: customer.creditHold ? 'On hold' : 'No hold' },
          {
            label: `Credit limit (${customer.currency})`,
            value: formatMinorUnits(customer.creditLimitMinor, customer.currency),
          },
          { label: 'Payment terms', value: `${customer.termsDays} days` },
        ]}
      />
    </View>
  );
}
