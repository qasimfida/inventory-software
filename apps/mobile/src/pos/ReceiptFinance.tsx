import type { createSalesClient } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import { RecordDetails } from '../ui/RecordDetails';
import { EmptyState } from '../ui/AsyncState';
import { RecordTable } from '../ui/RecordTable';
import { Text } from '../ui/Themed';
type Receipt = Awaited<ReturnType<ReturnType<typeof createSalesClient>['receipt']>>;
/** Recorded settlement evidence only; never calculates or confirms a refund. */
export function ReceiptFinance({
  receipt,
  timeZone,
}: {
  receipt: Receipt;
  timeZone: string | undefined;
}) {
  return (
    <>
      <RecordDetails
        label="Recorded settlement"
        items={[
          {
            label: 'Financial reconciliation',
            value: receipt.finance.reconciled ? 'Matched' : 'Review required',
          },
          { label: 'Currency', value: `${receipt.sale.currency} minor units` },
          { label: 'Outstanding', value: receipt.finance.outstandingMinor },
          { label: 'Due date', value: receipt.finance.dueDate ?? 'Not specified' },
        ]}
      />
      <Evidence
        label="Corrections history"
        columns={[
          'Recorded',
          'Type',
          'Reason',
          'Credit (minor units)',
          'Cash refund (minor units)',
          'Return reference',
          'Replacement sale reference',
        ]}
        rows={receipt.finance.returns.map((r) => ({
          id: r.id,
          cells: [
            businessTime(r.createdAt, timeZone),
            r.kind,
            r.reasonCode.replaceAll('_', ' '),
            r.creditMinor,
            r.cashRefundMinor,
            r.id,
            r.replacementSaleId ?? 'None',
          ],
        }))}
      />
      <Evidence
        label="Confirmed refunds"
        columns={[
          'Refund reference',
          'Return reference',
          'Payment reference',
          'Amount (minor units)',
        ]}
        rows={receipt.finance.refunds.map((r) => ({
          id: r.id,
          cells: [r.id, r.returnId, r.paymentId, r.amountMinor],
        }))}
      />
    </>
  );
}
function Evidence({
  label,
  columns,
  rows,
}: {
  label: string;
  columns: string[];
  rows: { id: string; cells: string[] }[];
}) {
  return (
    <>
      <Text accessibilityRole="header">{label}</Text>
      {!rows.length ? (
        <EmptyState
          message={`No ${label.toLowerCase()}`}
          description="Confirmed records will appear here when available."
        />
      ) : (
        <RecordTable label={label} columns={columns} rows={rows} />
      )}
    </>
  );
}
