import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { decimal, decimalString } from '@inventory/domain';
import type { createSalesClient } from './sales.js';
import type { CommandForm } from './forms.js';
import { formText } from './forms.js';
type Client = ReturnType<typeof createSalesClient>;
export function returnForms(
  client: Client,
  business: Business,
  receipt: Awaited<ReturnType<Client['receipt']>>,
): CommandForm[] {
  if (receipt.sale.state === 'voided' || receipt.sale.state === 'returned') return [];
  const remaining = receipt.lines
    .map((l) => ({
      ...l,
      remaining: decimalString(
        decimal(l.quantity) -
          decimal(
            receipt.finance.returnedLines.find((r) => r.saleLineId === l.id)?.quantity ?? '0',
          ),
      ),
    }))
    .filter((l) => decimal(l.remaining) > 0n);
  const reason = {
    name: 'reasonCode',
    label: 'Return reason',
    kind: 'select' as const,
    options: ['unwanted', 'defective', 'incorrect', 'cancellation'].map((value) => ({
      value,
      label: value,
    })),
  };
  const disposition = {
    name: 'disposition',
    label: 'Return disposition',
    kind: 'select' as const,
    options: ['restock', 'damaged', 'non_restockable'].map((value) => ({ value, label: value })),
  };
  const forms: CommandForm[] = [];
  if (hasPermission(business, 'sales.refund'))
    forms.push({
      title: 'Return selected sale line',
      fields: [
        {
          name: 'saleLineId',
          label: 'Original sale line',
          kind: 'select',
          options: remaining.map((l) => ({
            value: l.id,
            label: `${l.sku} · eligible ${l.remaining}`,
          })),
        },
        { name: 'quantity', label: 'Return quantity', value: '1' },
        {
          name: 'kind',
          label: 'Correction type',
          kind: 'select',
          options: [
            { value: 'return', label: 'Return and refund' },
            { value: 'exchange', label: 'Exchange: refund first, then replacement sale' },
          ],
        },
        reason,
        disposition,
        { name: 'note', label: 'Return explanation' },
      ],
      submit: (v) =>
        client.returnSale(receipt.sale.id, {
          kind: v.kind === 'exchange' ? 'exchange' : 'return',
          reasonCode: formText(v, 'reasonCode') as 'unwanted',
          note: formText(v, 'note'),
          lines: [
            {
              saleLineId: formText(v, 'saleLineId'),
              quantity: formText(v, 'quantity'),
              disposition: formText(v, 'disposition') as 'restock',
            },
          ],
        }),
    });
  for (const kind of ['return', 'void'] as const) {
    if (
      !hasPermission(business, kind === 'void' ? 'sales.void' : 'sales.refund') ||
      (kind === 'void' && receipt.finance.returns.length)
    )
      continue;
    forms.push({
      title: kind === 'void' ? 'Void full sale' : 'Return all remaining lines',
      fields: [
        disposition,
        { name: 'note', label: kind === 'void' ? 'Void explanation' : 'Full return explanation' },
      ],
      submit: (v) =>
        client.returnSale(receipt.sale.id, {
          kind,
          reasonCode: 'cancellation',
          note: formText(v, 'note'),
          lines: remaining.map((l) => ({
            saleLineId: l.id,
            quantity: l.remaining,
            disposition: formText(v, 'disposition') as 'restock',
          })),
        }),
    });
  }
  return forms;
}
