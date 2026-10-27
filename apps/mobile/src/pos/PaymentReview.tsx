import { useState } from 'react';
import { View } from 'react-native';
import { checkoutForm, paymentAllocation } from '@inventory/api-client';
import type { PosModel, PosState } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { Field } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { CommandForm } from '../components/CommandForm';
export function PaymentReview({
  model,
  state,
  canOverride,
}: {
  model: PosModel;
  state: PosState;
  canOverride: boolean;
}) {
  const theme = useTheme(),
    [applied, setApplied] = useState(state.quote?.totalMinor ?? '0'),
    [received, setReceived] = useState(state.quote?.totalMinor ?? '0');
  const form = checkoutForm(model, state, canOverride);
  if (state.uncertain) return <CommandForm inline definition={form} run={(work) => void work()} />;
  if (!state.quote) return null;
  const allocation = paymentAllocation(
    state.quote.totalMinor,
    applied,
    received,
    !!state.customerId,
  );
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text accessibilityRole="header">Cash and customer credit</Text>
      <Text>
        Credit is an unpaid customer balance, subject to server authorization and limits. Card
        payments are unavailable.
      </Text>
      <Field
        label="Cash applied (minor units)"
        value={applied}
        onChange={setApplied}
        disabled={state.busy}
      />
      <Field
        label="Cash tendered (minor units)"
        value={received}
        onChange={setReceived}
        disabled={state.busy}
      />
      {allocation.error ? (
        <Text accessibilityRole="alert">{allocation.error}</Text>
      ) : (
        <Text accessibilityLiveRegion="polite">
          Cash: {formatMinorUnits(allocation.cash, state.quote.currency)} · Unpaid credit:{' '}
          {formatMinorUnits(allocation.credit, state.quote.currency)} · Change:{' '}
          {formatMinorUnits(allocation.change, state.quote.currency)}
        </Text>
      )}
      {!allocation.error && !state.busy && (
        <CommandForm
          inline
          definition={{
            ...form,
            fields: form.fields.filter(
              (f) => !['cashAppliedMinor', 'cashReceivedMinor'].includes(f.name),
            ),
            submit: (v) =>
              form.submit({ ...v, cashAppliedMinor: applied, cashReceivedMinor: received }),
          }}
          run={(work) => void work()}
        />
      )}
    </View>
  );
}
