import { accountingAccounts, currencySchema, hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import type { createAccountingClient } from './stage6.js';
import { formText } from './forms.js';
import type { CommandForm, CommandField } from './forms.js';
type Client = ReturnType<typeof createAccountingClient>;
type Page = Awaited<ReturnType<Client['load']>>;
const field = (name: string, label: string, value = ''): CommandField => ({
  name,
  label,
  value,
  kind: 'text',
});
export function canReadAccounting(b: Business) {
  return (
    !b.scope?.storeId &&
    (['reports.read', 'payments.read', 'purchases.read', 'sales.read'] as const).every((p) =>
      hasPermission(b, p),
    )
  );
}
export function accountingForms(client: Client, data: Page, business: Business): CommandForm[] {
  if (!hasPermission(business, 'reports.write') || !hasPermission(business, 'payments.write'))
    return [];
  const today = new Date().toISOString().slice(0, 10);
  const forms: CommandForm[] = [
    {
      title: 'Create accounting period',
      fields: [
        field('from', 'Period starts (YYYY-MM-DD)', today.slice(0, 7) + '-01'),
        field('to', 'Period ends (YYYY-MM-DD)', today),
      ],
      submit: (v) => client.period({ from: formText(v, 'from'), to: formText(v, 'to') }),
    },
  ];
  const accounts = accountingAccounts.map((a) => ({ value: a.code, label: `${a.code} ${a.name}` }));
  forms.push({
    title: 'Confirm balanced manual journal',
    fields: [
      field('date', 'Posting date (YYYY-MM-DD)', today),
      {
        name: 'currency',
        label: 'Journal currency',
        kind: 'select',
        options: currencySchema.options.map((value) => ({ value, label: value })),
      },
      { name: 'debit', label: 'Debit account', kind: 'select', options: accounts },
      { name: 'credit', label: 'Credit account', kind: 'select', options: accounts },
      field('amount', 'Amount in minor units'),
      field('reason', 'Journal reason (at least 10 characters)'),
    ],
    submit: (v) =>
      client.manual({
        date: formText(v, 'date'),
        currency: formText(v, 'currency') as 'USD',
        reason: formText(v, 'reason'),
        lines: [
          { account: formText(v, 'debit') as '1000', debit: formText(v, 'amount'), credit: '0' },
          { account: formText(v, 'credit') as '1000', credit: formText(v, 'amount'), debit: '0' },
        ],
      }),
  });
  if (data.pending.length)
    forms.push({
      title: 'Confirm source posting',
      fields: [
        {
          name: 'id',
          label: 'Unposted source (date, type, ID, amount)',
          kind: 'select',
          options: data.pending.map((s) => ({
            value: `${s.kind}:${s.id}`,
            label: `${s.date} ${s.kind} ${s.id} · ${s.amount} ${s.currency} minor units`,
          })),
        },
      ],
      submit: (v) => {
        const s = data.pending.find((s) => `${s.kind}:${s.id}` === v.id)!;
        return client.source({ kind: s.kind, sourceId: s.id });
      },
    });
  const originals = data.journals.filter(
    (j) => j.sourceKind !== 'reversal' && !data.journals.some((r) => r.reversalId === j.id),
  );
  if (originals.length)
    forms.push({
      title: 'Confirm journal reversal',
      fields: [
        {
          name: 'id',
          label: 'Original journal',
          kind: 'select',
          options: originals.map((j) => ({
            value: j.id,
            label: `${j.date} ${j.sourceKind} ${j.id}`,
          })),
        },
        field('date', 'Reversal date (YYYY-MM-DD)', today),
        field('reason', 'Correction reason (at least 10 characters)'),
      ],
      submit: (v) =>
        client.reverse(formText(v, 'id'), {
          date: formText(v, 'date'),
          reason: formText(v, 'reason'),
        }),
    });
  const periods = data.periods.filter((p) => p.state === 'open' && p.to < today);
  if (periods.length)
    forms.push({
      title: 'Confirm permanent period close',
      fields: [
        {
          name: 'id',
          label: 'Elapsed accounting period',
          kind: 'select',
          options: periods.map((p) => ({ value: p.id, label: `${p.from} — ${p.to}` })),
        },
        field('reason', 'Close reason (at least 10 characters)'),
      ],
      submit: (v) => client.close(formText(v, 'id'), { reason: formText(v, 'reason') }),
    });
  return forms;
}
