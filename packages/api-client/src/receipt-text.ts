import { formatMinorUnits } from '@inventory/domain';
import type { createSalesClient } from './sales.js';
export function receiptText(
  r: Awaited<ReturnType<ReturnType<typeof createSalesClient>['receipt']>>,
) {
  const money = (amount: string) => formatMinorUnits(amount, r.sale.currency);
  return [
    `Receipt / reprint: ${r.sale.id}`,
    `Date: ${r.sale.createdAt}`,
    `Status: ${r.sale.state}`,
    `Warehouse: ${r.sale.warehouseId}`,
    ...r.lines.map(
      (l) =>
        `${l.sku} ${l.name} · ${l.quantity} · ${money(l.totalMinor)} (tax ${money(l.taxMinor)})`,
    ),
    `Net: ${money(r.sale.netMinor)}`,
    `Tax: ${money(r.sale.taxMinor)}`,
    `Original total: ${money(r.sale.totalMinor)}`,
    `Cash tendered at checkout: ${money(r.sale.cashReceivedMinor)}`,
    `Change at checkout: ${money(r.sale.changeMinor)}`,
    ...r.payments.map((p) => `Confirmed cash ${p.id}: ${money(p.amountMinor)}`),
    `Financial reconciliation: ${r.finance.reconciled ? 'matched' : 'REVIEW REQUIRED'}`,
    `Outstanding: ${money(r.finance.outstandingMinor)}`,
    `Due: ${r.finance.dueDate ?? '—'}`,
    ...r.finance.returns.map(
      (x) =>
        `${x.kind} ${x.id}: credit ${money(x.creditMinor)}, cash refund ${money(x.cashRefundMinor)}${x.replacementSaleId ? ` · replacement ${x.replacementSaleId}` : ''}`,
    ),
    ...r.finance.refunds.map(
      (f) => `Refund ${f.id} against cash payment ${f.paymentId}: ${money(f.amountMinor)}`,
    ),
    ...(r.sale.receiptFooter ? [r.sale.receiptFooter] : []),
  ].join('\n');
}
