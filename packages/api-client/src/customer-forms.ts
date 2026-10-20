import {
  customerInputSchema,
  customerCreditSchema,
  currencySchema,
  priceInputSchema,
  hasPermission,
} from '@inventory/contracts';
import type { Business, Customer } from '@inventory/contracts';
import type { CommandForm, CommandField } from './forms.js';
import type { createCustomerClient } from './customers.js';
import type { createPricingClient } from './pricing.js';
type Client = ReturnType<typeof createCustomerClient>;
const text = (name: string, label: string, value = '', required = true): CommandField => ({
  name,
  label,
  kind: 'text',
  value,
  required,
});
export function customerProfileForm(client: Client, storeId: string, c?: Customer): CommandForm {
  return {
    title: c ? `Save customer ${c.code}` : 'Create customer',
    fields: [
      text('code', 'Customer code', c?.code),
      text('name', 'Customer name', c?.name),
      text('email', 'Customer email', c?.email, false),
      text('phone', 'Phone (+country code and digits)', c?.phone, false),
      text('address', 'Customer address', c?.address, false),
      text('notes', 'Customer notes', c?.notes, false),
      {
        name: 'currency',
        label: 'Customer currency',
        kind: 'select',
        value: c?.currency ?? 'USD',
        options: (c ? [c.currency] : currencySchema.options).map((value) => ({
          value,
          label: value,
        })),
      },
      {
        name: 'state',
        label: 'Customer status',
        kind: 'select',
        value: c?.state ?? 'active',
        options: ['active', 'inactive', 'archived'].map((value) => ({ value, label: value })),
      },
    ],
    submit: (v) => client.save(customerInputSchema.parse({ ...v, storeId }), c?.id, c?.version),
  };
}
export function customerDetailForms(
  client: Client,
  pricing: ReturnType<typeof createPricingClient>,
  c: Customer,
  business: Business,
  statement: Awaited<ReturnType<Client['statement']>>,
): CommandForm[] {
  const forms: CommandForm[] = [];
  if (hasPermission(business, 'customers.write') && !c.anonymized)
    forms.push(customerProfileForm(client, c.storeId, c));
  if (hasPermission(business, 'customers.credit'))
    forms.push({
      title: 'Save credit policy',
      fields: [
        {
          name: 'creditEnabled',
          label: 'Credit eligible',
          kind: 'boolean',
          value: c.creditEnabled,
        },
        { name: 'creditHold', label: 'Credit hold', kind: 'boolean', value: c.creditHold },
        text('creditLimitMinor', `Credit limit (${c.currency} minor units)`, c.creditLimitMinor),
        { name: 'termsDays', label: 'Payment terms (days)', kind: 'number', value: c.termsDays },
      ],
      submit: (v) => client.credit(c.id, customerCreditSchema.parse({ ...v, version: c.version })),
    });
  if (
    hasPermission(business, 'payments.write') &&
    statement.receivables.some((r) => BigInt(r.outstandingMinor) > 0n)
  )
    forms.push({
      title: 'Record customer cash payment',
      fields: [
        {
          name: 'receivableId',
          label: 'Outstanding receivable',
          kind: 'select',
          options: statement.receivables
            .filter((r) => BigInt(r.outstandingMinor) > 0n)
            .map((r) => ({
              value: r.id,
              label: `${r.saleId} · due ${r.dueDate} · outstanding ${r.outstandingMinor}`,
            })),
        },
        text('amountMinor', `Cash received (${c.currency} minor units)`),
        text('reference', 'Payment receipt reference'),
      ],
      submit: (v) =>
        client.pay(c.id, {
          receivableId: String(v.receivableId),
          amountMinor: String(v.amountMinor),
          reference: String(v.reference),
        }),
    });
  if (hasPermission(business, 'products.write') && !business.scope?.warehouseId)
    forms.push({
      title: 'Publish customer price',
      fields: [
        text('variantId', 'Customer price variant ID'),
        text('unitPrice', `Price per base unit (${c.currency})`),
        text('startsAt', 'Customer price effective from (UTC ISO)', new Date().toISOString()),
        text('endsAt', 'Customer price effective until (optional)', '', false),
        { name: 'taxBasisPoints', label: 'Tax basis points (100 = 1%)', kind: 'number', value: 0 },
        { name: 'taxInclusive', label: 'Price includes tax', kind: 'boolean', value: false },
      ],
      submit: (v) =>
        pricing.price(
          priceInputSchema.parse({
            ...v,
            customerId: c.id,
            storeId: c.storeId,
            currency: c.currency,
            endsAt: v.endsAt || null,
          }),
        ),
    });
  return forms;
}

export function customerRetentionForms(
  client: Client,
  policy: { inactiveDays: number; version: number },
): CommandForm[] {
  return [
    {
      title: 'Save customer retention policy',
      fields: [
        {
          name: 'inactiveDays',
          label: 'Inactive days before profile anonymization',
          kind: 'number',
          value: policy.inactiveDays,
        },
      ],
      submit: (v) =>
        client.saveRetention({ inactiveDays: Number(v.inactiveDays), version: policy.version }),
    },
    {
      title: 'Anonymize eligible inactive customer profiles',
      fields: [],
      submit: () => client.runRetention(),
    },
  ];
}
