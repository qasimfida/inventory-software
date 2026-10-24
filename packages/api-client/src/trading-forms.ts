import { currencySchema } from '@inventory/contracts';
import type { createTradingClient } from './stage6.js';
import { formText } from './forms.js';
import type { CommandForm, CommandField } from './forms.js';
type Client = ReturnType<typeof createTradingClient>;
type Page = Awaited<ReturnType<Client['load']>>;
const field = (name: string, label: string, value = ''): CommandField => ({
  name,
  label,
  value,
  kind: 'text',
});
export function tradingForms(client: Client, data: Page, businessId: string): CommandForm[] {
  const forms: CommandForm[] = [
    {
      title: 'Invite trading partner',
      fields: [field('partnerId', 'Partner business ID (obtain from its owner)')],
      submit: (v) => client.invite({ partnerId: formText(v, 'partnerId') }),
    },
  ];
  const relationships = data.relationships.filter((r) => r.state !== 'revoked');
  if (relationships.length)
    forms.push({
      title: 'Confirm relationship decision',
      fields: [
        {
          name: 'id',
          label: 'Relationship',
          kind: 'select',
          options: relationships.map((r) => ({ value: r.id, label: `${r.id} · ${r.state}` })),
        },
        {
          name: 'action',
          label: 'Decision',
          kind: 'select',
          options: [
            { value: 'accept', label: 'Accept sharing order terms (invited business only)' },
            { value: 'revoke', label: 'Revoke future trading' },
          ],
        },
      ],
      submit: (v) => {
        const r = relationships.find((r) => r.id === v.id)!;
        return client.consent(r.id, {
          version: r.version,
          action: formText(v, 'action') as 'accept' | 'revoke',
        });
      },
    });
  const active = relationships.filter((r) => r.state === 'active');
  if (active.length)
    forms.push({
      title: 'Submit shared order terms',
      fields: [
        {
          name: 'relationshipId',
          label: 'Trading relationship',
          kind: 'select',
          options: active.map((r) => ({
            value: r.id,
            label: r.proposerId === businessId ? r.partnerId : r.proposerId,
          })),
        },
        field('reference', 'Your unique order reference'),
        field('description', 'Shared item description'),
        field('quantity', 'Quantity', '1'),
        field('unit', 'Agreed unit', 'each'),
        field('unitPriceMinor', 'Agreed unit price in minor units'),
        {
          name: 'currency',
          label: 'Order currency',
          kind: 'select',
          options: currencySchema.options.map((value) => ({ value, label: value })),
        },
      ],
      submit: (v) =>
        client.create({
          relationshipId: formText(v, 'relationshipId'),
          reference: formText(v, 'reference'),
          currency: formText(v, 'currency') as 'USD',
          lines: [
            {
              description: formText(v, 'description'),
              quantity: formText(v, 'quantity'),
              unit: formText(v, 'unit'),
              unitPriceMinor: formText(v, 'unitPriceMinor'),
            },
          ],
        }),
    });
  const orders = data.orders.filter((o) => !['received', 'cancelled'].includes(o.state));
  if (orders.length)
    forms.push({
      title: 'Confirm shared order status',
      fields: [
        {
          name: 'id',
          label: 'Shared order',
          kind: 'select',
          options: orders.map((o) => ({ value: o.id, label: `${o.reference} · ${o.state}` })),
        },
        {
          name: 'action',
          label: 'Order action',
          kind: 'select',
          options: [
            { value: 'accept', label: 'Seller accepts terms' },
            { value: 'dispatch', label: 'Seller confirms physical dispatch' },
            { value: 'receive', label: 'Buyer confirms physical receipt' },
            { value: 'cancel', label: 'Cancel before dispatch' },
          ],
        },
        field('note', 'Shared confirmation note (no private data)'),
      ],
      submit: (v) => {
        const o = orders.find((o) => o.id === v.id)!;
        return client.transition(o.id, {
          version: o.version,
          action: formText(v, 'action') as 'accept' | 'dispatch' | 'receive' | 'cancel',
          note: formText(v, 'note'),
        });
      },
    });
  return forms;
}
