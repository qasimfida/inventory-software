import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import type { createPayableClient } from './payables.js';
import type { CommandField, CommandForm } from './forms.js';
type Client = ReturnType<typeof createPayableClient>;
export function payableForms(
  client: Client,
  business: Business,
  data: Awaited<ReturnType<Client['detail']>>,
): CommandForm[] {
  if (!hasPermission(business, 'payments.write')) return [];
  const { invoice } = data,
    forms: CommandForm[] = [];
  const text = (name: string, label: string, value = ''): CommandField => ({
    name,
    label,
    value,
    required: true,
  });
  const outstanding = BigInt(invoice.outstandingMinor);
  if (outstanding !== 0n && hasPermission(business, 'payments.cash'))
    forms.push({
      title: outstanding > 0n ? 'Record supplier cash payment' : 'Record cash refund from supplier',
      fields: [
        text(
          'amountMinor',
          `Cash ${outstanding > 0n ? 'paid' : 'received'} (${invoice.currency} minor units)`,
        ),
        text('reference', 'Supplier cash receipt reference'),
      ],
      submit: (v) =>
        client.settle(invoice.id, {
          kind: outstanding > 0n ? 'payment' : 'refund',
          amountMinor: String(v.amountMinor),
          reference: String(v.reference),
        }),
    });
  if (
    hasPermission(business, 'purchases.write') &&
    BigInt(invoice.creditMinor) < BigInt(invoice.amountMinor)
  )
    forms.push({
      title: 'Record confirmed supplier return credit',
      fields: [
        text('returnId', 'Purchase return ID', data.returns[0]?.id),
        text('amountMinor', `Agreed supplier credit (${invoice.currency} minor units)`),
        text('reference', 'Supplier credit note reference'),
        text('reason', 'Supplier credit reason'),
      ],
      submit: (v) =>
        client.credit(invoice.id, {
          returnId: String(v.returnId),
          amountMinor: String(v.amountMinor),
          reference: String(v.reference),
          reason: String(v.reason),
        }),
    });
  return forms;
}
