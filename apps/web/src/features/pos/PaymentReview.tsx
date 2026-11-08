import { useState } from 'react';
import { checkoutForm, paymentAllocation } from '@inventory/api-client';
import type { PosModel, PosState } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { Input } from '@/components/ui/FormControls';
import { CommandForm } from '@/components/common/CommandForm';
export function PaymentReview({
  model,
  state,
  canOverride,
}: {
  model: PosModel;
  state: PosState;
  canOverride: boolean;
}) {
  const [applied, setApplied] = useState(state.quote?.totalMinor ?? '0'),
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
    <section aria-label="Payment allocation" className="pos-payment-review space-y-2">
      <h4>Cash and customer credit</h4>
      <p>
        Credit is an unpaid customer balance, subject to server authorization and limits. Card
        payments are unavailable.
      </p>
      <label htmlFor="payment-applied">Cash applied (minor units)</label>
      <Input
        id="payment-applied"
        inputMode="numeric"
        value={applied}
        onChange={(e) => setApplied(e.target.value)}
        disabled={state.busy}
      />
      <label htmlFor="payment-received">Cash tendered (minor units)</label>
      <Input
        id="payment-received"
        inputMode="numeric"
        value={received}
        onChange={(e) => setReceived(e.target.value)}
        disabled={state.busy}
      />
      {allocation.error ? (
        <p role="alert">{allocation.error}</p>
      ) : (
        <dl className="checkout-totals" aria-live="polite">
          <div>
            <dt>Cash applied</dt>
            <dd>{formatMinorUnits(allocation.cash, state.quote.currency)}</dd>
          </div>
          <div>
            <dt>Unpaid customer credit</dt>
            <dd>{formatMinorUnits(allocation.credit, state.quote.currency)}</dd>
          </div>
          <div>
            <dt>Change due</dt>
            <dd>{formatMinorUnits(allocation.change, state.quote.currency)}</dd>
          </div>
        </dl>
      )}
      <fieldset disabled={!!allocation.error || state.busy}>
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
          run={(work) => {
            if (!allocation.error) void work();
          }}
        />
      </fieldset>
    </section>
  );
}
