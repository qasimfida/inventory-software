import { currencySchema, staffInputSchema } from '@inventory/contracts';
import type { Location, Staff, OperationsPage } from '@inventory/contracts';
import type { createOperationsClient } from './operations.js';
import { costInputSchema, costPaymentSchema } from './operations.js';
import type { CommandForm } from './forms.js';
import { formText as text } from './forms.js';
type Client = ReturnType<typeof createOperationsClient>;
const currencies = currencySchema.options.map((value) => ({ value, label: value }));
const key = '00000000-0000-4000-8000-000000000001'; // Validation only; RetryableCommands supplies a durable per-command key.
export function staffForm(
  client: Client,
  locations: Location[],
  currency: string,
  staff?: Staff,
): CommandForm {
  return {
    title: staff ? 'Edit staff member' : 'Add staff member',
    fields: [
      { name: 'name', label: 'Full name', value: staff?.name ?? '', required: true },
      { name: 'code', label: 'Employee code', value: staff?.code ?? '', required: true },
      { name: 'title', label: 'Job title', required: false, value: staff?.title ?? '' },
      {
        name: 'storeId',
        label: 'Store / branch',
        required: false,
        kind: 'select',
        value: staff?.storeId ?? '',
        options: [
          { value: '', label: 'Business-wide' },
          ...locations
            .filter((l) => l.kind === 'stores' && l.state === 'active')
            .map((l) => ({ value: l.id, label: l.name })),
        ],
      },
      {
        name: 'currency',
        label: 'Salary currency',
        kind: 'select',
        value: staff?.currency ?? currency,
        options: currencies,
      },
      {
        name: 'salaryMinor',
        label: 'Base salary per pay period (minor units)',
        value: staff?.salaryMinor ?? '0',
        required: true,
      },
      {
        name: 'state',
        label: 'Employment status',
        kind: 'select',
        value: staff?.state ?? 'active',
        options: ['active', 'inactive'].map((value) => ({ value, label: value })),
      },
    ],
    submit: (v) =>
      client.save(
        staffInputSchema.parse({ ...v, storeId: text(v, 'storeId') || null }),
        staff?.id,
        staff?.version,
      ),
  };
}
export function costForm(
  client: Client,
  locations: Location[],
  currency: string,
  staff?: Staff,
): CommandForm {
  const date = new Date().toISOString().slice(0, 10);
  return {
    title: staff ? `Record salary · ${staff.name}` : 'Record business expense',
    fields: [
      {
        name: 'description',
        label: 'Description',
        value: staff ? `Salary · ${staff.name}` : '',
        required: true,
      },
      { name: 'reference', label: 'Unique reference', required: true },
      ...(!staff
        ? [
            {
              name: 'storeId',
              label: 'Store / branch',
              required: false,
              kind: 'select' as const,
              value: '',
              options: [
                { value: '', label: 'Business-wide' },
                ...locations
                  .filter((l) => l.kind === 'stores' && l.state === 'active')
                  .map((l) => ({ value: l.id, label: l.name })),
              ],
            },
          ]
        : []),
      {
        name: 'periodStart',
        label: staff ? 'Pay period starts (YYYY-MM-DD)' : 'Expense date (YYYY-MM-DD)',
        value: date,
        required: true,
      },
      {
        name: 'periodEnd',
        label: staff ? 'Pay period ends (YYYY-MM-DD)' : 'End date (YYYY-MM-DD)',
        value: date,
        required: true,
      },
      {
        name: 'currency',
        label: 'Currency',
        kind: 'select',
        value: staff?.currency ?? currency,
        options: staff ? [{ value: staff.currency, label: staff.currency }] : currencies,
      },
      {
        name: 'amountMinor',
        label: 'Amount (minor units)',
        value: staff?.salaryMinor ?? '',
        required: true,
      },
    ],
    submit: (v) => {
      const parsed = costInputSchema.parse({
        ...v,
        kind: staff ? 'salary' : 'expense',
        staffId: staff?.id ?? null,
        storeId: staff ? staff.storeId : text(v, 'storeId') || null,
        idempotencyKey: key,
      });
      const { idempotencyKey: ignored, ...input } = parsed;
      void ignored;
      return client.cost(input);
    },
  };
}
export function costPaymentForm(
  client: Client,
  cost: OperationsPage['costs'][number],
): CommandForm {
  return {
    title: `Record payment · ${cost.reference}`,
    fields: [
      {
        name: 'amountMinor',
        label: `Amount paid (${cost.currency} minor units)`,
        value: (BigInt(cost.amountMinor) - BigInt(cost.paidMinor)).toString(),
        required: true,
      },
      { name: 'reference', label: 'Payment reference', required: true },
      {
        name: 'paidOn',
        label: 'Payment date (YYYY-MM-DD)',
        value: new Date().toISOString().slice(0, 10),
        required: true,
      },
    ],
    submit: (v) => {
      const { idempotencyKey: ignored, ...input } = costPaymentSchema.parse({
        ...v,
        idempotencyKey: key,
      });
      void ignored;
      return client.pay(cost.id, input);
    },
  };
}
