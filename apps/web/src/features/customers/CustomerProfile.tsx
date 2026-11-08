import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { RecordDetails } from '@/components/common/RecordDetails';
import type { Customer } from '@inventory/contracts';
export function CustomerProfile({ customer, store }: { customer: Customer; store: string }) {
  const { formatMinorUnits } = useDisplayMoney();

  return (
    <div className="min-w-0 shrink-0 space-y-3">
      <h3>Customer profile</h3>
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
      <h3>Credit policy</h3>
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
    </div>
  );
}
