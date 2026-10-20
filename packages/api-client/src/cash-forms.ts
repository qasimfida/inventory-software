import { hasPermission, currencySchema } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import type { createCashClient } from './cash.js';
import type { CommandForm } from './forms.js';
import { formText } from './forms.js';
type Client = ReturnType<typeof createCashClient>;
export function cashForms(
  client: Client,
  business: Business,
  warehouseId: string,
  locations: Location[],
  shifts: Awaited<ReturnType<Client['list']>>['shifts'],
): CommandForm[] {
  if (!hasPermission(business, 'payments.write')) return [];
  const terminals = locations.filter(
    (l) => l.kind === 'terminals' && l.warehouseId === warehouseId && l.state === 'active',
  );
  const forms: CommandForm[] = [
    {
      title: 'Open cash shift',
      fields: [
        {
          name: 'terminalId',
          label: 'Cash terminal',
          kind: 'select',
          options: terminals.map((t) => ({ value: t.id, label: t.name })),
        },
        {
          name: 'currency',
          label: 'Cash currency',
          kind: 'select',
          options: currencySchema.options.map((value) => ({ value, label: value })),
        },
        { name: 'openingMinor', label: 'Opening float (minor units)', value: '0' },
      ],
      submit: (v) =>
        client.open({
          warehouseId,
          terminalId: formText(v, 'terminalId'),
          currency: currencySchema.parse(v.currency),
          openingMinor: formText(v, 'openingMinor'),
        }),
    },
  ];
  for (const s of shifts.filter((s) => s.state === 'open')) {
    forms.push({
      title: `Close cash shift ${s.id}`,
      fields: [{ name: 'countedMinor', label: 'Counted cash (minor units)' }],
      submit: (v) => client.close(s.id, { countedMinor: formText(v, 'countedMinor') }),
    });
    if (hasPermission(business, 'payments.cash'))
      forms.push({
        title: `Cash adjustment ${s.id}`,
        fields: [
          {
            name: 'kind',
            label: 'Cash direction',
            kind: 'select',
            options: [
              { value: 'cash_in', label: 'Cash in' },
              { value: 'cash_out', label: 'Cash out' },
            ],
          },
          { name: 'amountMinor', label: 'Cash adjustment (minor units)' },
          { name: 'reference', label: 'Cash adjustment reason' },
        ],
        submit: (v) =>
          client.adjust(s.id, {
            kind: v.kind === 'cash_in' ? 'cash_in' : 'cash_out',
            amountMinor: formText(v, 'amountMinor'),
            reference: formText(v, 'reference'),
          }),
      });
  }
  return forms;
}
