import type { OfflinePolicy } from '@inventory/contracts';
import { offlinePolicySchema } from '@inventory/contracts';
import type { CommandForm } from './forms.js';
import type { createSyncClient } from './sync-client.js';
export function offlinePolicyForm(
  client: ReturnType<typeof createSyncClient>,
  policy: OfflinePolicy,
): CommandForm {
  return {
    title: 'Save offline policy',
    fields: [
      {
        name: 'enabled',
        label: 'Enable offline cash sales',
        kind: 'boolean',
        value: policy.enabled,
      },
      {
        name: 'leaseMinutes',
        label: 'Offline permission lifetime (minutes, maximum 480)',
        kind: 'number',
        value: policy.leaseMinutes,
      },
      {
        name: 'maxSaleMinor',
        label: 'Maximum offline sale (currency minor units)',
        value: policy.maxSaleMinor,
      },
      {
        name: 'maxLeaseMinor',
        label: 'Maximum cash per offline permission (minor units)',
        value: policy.maxLeaseMinor,
      },
      {
        name: 'maxDiscountBasisPoints',
        label: 'Maximum offline manual discount (basis points)',
        kind: 'number',
        value: policy.maxDiscountBasisPoints,
      },
      {
        name: 'maxLineQuantity',
        label: 'Maximum offline line quantity',
        value: policy.maxLineQuantity,
      },
      {
        name: 'requireCachedStock',
        label: 'Enforce cached stock allowance (global stock still checked on upload)',
        kind: 'boolean',
        value: policy.requireCachedStock,
      },
      {
        name: 'pricePolicy',
        label: 'Changed price reconciliation',
        kind: 'select',
        value: policy.pricePolicy,
        options: [
          { value: 'reject_changed', label: 'Require review when prices change' },
          { value: 'honor_snapshot', label: 'Honor the granted price snapshot' },
        ],
      },
    ],
    submit: (v) => client.savePolicy(offlinePolicySchema.parse({ ...policy, ...v })),
  };
}
