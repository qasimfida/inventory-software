import type { CommandForm } from './forms.js';
import type { PosModel } from './pos-model.js';
import type { PosState } from './pos-types.js';
export function checkoutForm(model: PosModel, state: PosState, canOverride: boolean): CommandForm {
  return {
    title: state.uncertain ? 'Retry same checkout' : 'Complete cash / credit sale',
    fields: state.uncertain
      ? []
      : [
          {
            name: 'cashAppliedMinor',
            label: 'Cash applied (minor units)',
            value: state.quote?.totalMinor ?? '0',
          },
          {
            name: 'cashReceivedMinor',
            label: 'Cash tendered (minor units)',
            value: state.quote?.totalMinor ?? '0',
          },
          { name: 'exchangeReturnId', label: 'Exchange return ID (optional)', required: false },
          ...(canOverride
            ? [
                {
                  name: 'creditOverrideReason',
                  label: 'Authorized credit override reason (optional)',
                  required: false,
                },
              ]
            : []),
        ],
    submit: (v) =>
      model.checkout(
        String(v.cashAppliedMinor ?? '0'),
        String(v.cashReceivedMinor ?? '0'),
        String(v.creditOverrideReason ?? ''),
        String(v.exchangeReturnId ?? ''),
      ),
  };
}
