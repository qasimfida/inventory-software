import { useDisplayMoney } from '../ui/useDisplayMoney';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { RecordDetails } from '../ui/RecordDetails';
import { businessTime } from '@inventory/contracts';
import type { createPayableClient } from '@inventory/api-client';
import { PayableEvidence } from './PayableEvidence';
type Detail = Awaited<ReturnType<ReturnType<typeof createPayableClient>['detail']>>;
const eventNames = {
  payment: 'Cash paid',
  refund: 'Cash refund received',
  credit: 'Return credit confirmed',
};
export function PayableDetails({
  detail,
  warehouse,
  timeZone,
}: {
  detail: Detail;
  warehouse: string;
  timeZone: string | undefined;
}) {
  const { formatMinorUnits } = useDisplayMoney();

  const theme = useTheme();
  const { invoice, returns, events } = detail;
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <RecordDetails
        label="Supplier invoice details"
        items={[
          { label: 'Supplier', value: invoice.supplierName },
          { label: 'Invoice', value: invoice.reference },
          { label: 'Warehouse', value: warehouse },
          { label: 'Due date', value: invoice.dueDate },
          { label: 'Purchase reference', value: invoice.purchaseId },
          { label: 'Supplier reference', value: invoice.supplierId },
        ]}
      />
      <PayableEvidence
        title="Invoice balances"
        columns={['Balance', `Amount (${invoice.currency})`]}
        numeric={[1]}
        empty="No invoice balances"
        rows={[
          {
            id: 'original',
            cells: ['Original invoice', formatMinorUnits(invoice.amountMinor, invoice.currency)],
          },
          {
            id: 'credits',
            cells: ['Confirmed credits', formatMinorUnits(invoice.creditMinor, invoice.currency)],
          },
          {
            id: 'paid',
            cells: ['Cash paid', formatMinorUnits(invoice.paidMinor, invoice.currency)],
          },
          {
            id: 'refunded',
            cells: ['Cash refunded', formatMinorUnits(invoice.refundedMinor, invoice.currency)],
          },
          {
            id: 'outstanding',
            cells: ['Outstanding', formatMinorUnits(invoice.outstandingMinor, invoice.currency)],
          },
        ]}
      />
      <Text tone="muted">
        Negative outstanding means the supplier owes cash back. Returning stock alone does not
        settle an invoice.
      </Text>
      <PayableEvidence
        title="Uncredited returns · latest 100"
        columns={['Return reference', 'Quantity', 'Credit reference']}
        numeric={[1]}
        empty="No uncredited returns in this response"
        rows={returns.map((r) => ({
          id: r.id,
          cells: [r.id, r.quantity, r.creditReference || 'Not provided'],
        }))}
      />
      <Text tone="muted"> Older return references remain available in purchase history. </Text>
      <PayableEvidence
        title="Settlement and credit history"
        columns={[
          'Event',
          `Amount (${invoice.currency})`,
          'Reference',
          'Reason',
          'Actor reference',
          'Recorded at',
          'Return / shift reference',
        ]}
        numeric={[1]}
        empty="No settlement or credit events"
        rows={events.map((e) => ({
          id: e.id,
          cells: [
            eventNames[e.kind],
            formatMinorUnits(e.amountMinor, invoice.currency),
            e.reference,
            e.reason || 'Not provided',
            e.actorId,
            businessTime(e.createdAt, timeZone),
            e.returnId ? `Return ${e.returnId}` : e.shiftId ? `Shift ${e.shiftId}` : 'Not provided',
          ],
        }))}
      />
    </View>
  );
}
