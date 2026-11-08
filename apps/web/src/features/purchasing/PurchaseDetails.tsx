import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { Table, TableScroll } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/AsyncState';
import type { createPurchasingClient } from '@inventory/api-client';
import { businessTime } from '@inventory/contracts';
import { RecordDetails } from '@/components/common/RecordDetails';
type Detail = Awaited<ReturnType<ReturnType<typeof createPurchasingClient>['detail']>>;
export function PurchaseDetails({
  detail,
  timeZone,
}: {
  detail: Detail;
  timeZone?: string | undefined;
}) {
  const { formatMinorUnits, formatDecimalPrice } = useDisplayMoney();

  return (
    <>
      <RecordDetails
        label="Purchase document"
        items={[
          { label: 'Reference', value: detail.order.reference },
          { label: 'State', value: detail.order.state.replaceAll('_', ' ') },
          { label: 'Currency', value: detail.order.currency },
          { label: 'Created', value: businessTime(detail.order.createdAt, timeZone) },
        ]}
      />
      <PurchaseRecords
        label="Order lines"
        columns={['Variant reference', 'Ordered quantity', 'Received quantity', 'Unit cost']}
        rows={detail.lines.map((line) => ({
          id: line.id,
          cells: [
            line.variantId,
            line.quantity,
            line.received,
            formatDecimalPrice(line.unitCost, detail.order.currency),
          ],
        }))}
      />
      <PurchaseRecords
        label="Delivery receipts"
        columns={[
          'Receipt reference',
          'Line reference',
          'Quantity',
          'Returned',
          'Damaged',
          'Damage reason',
          'Received at',
          'Actor reference',
          'Location reference',
          'Movement reference',
        ]}
        rows={detail.receipts.map((r) => ({
          id: r.id,
          cells: [
            r.id,
            r.lineId,
            r.quantity,
            r.returned,
            r.damaged,
            r.damageReason || 'None',
            businessTime(r.createdAt, timeZone),
            r.actorId,
            r.locationId,
            r.movementId,
          ],
        }))}
      />
      <PurchaseRecords
        label="Supplier invoices"
        columns={['Invoice', 'Original amount', 'Due date']}
        rows={detail.invoices.map((i) => ({
          id: i.id,
          cells: [i.reference, formatMinorUnits(i.amountMinor, detail.order.currency), i.dueDate],
        }))}
      />
      <PurchaseRecords
        label="Supplier returns"
        columns={[
          'Return reference',
          'Receipt reference',
          'Quantity',
          'Damaged',
          'Reason',
          'Credit reference',
          'Movement reference',
        ]}
        rows={detail.returns.map((r) => ({
          id: r.id,
          cells: [
            r.id,
            r.receiptId,
            r.quantity,
            r.damaged,
            r.reason,
            r.creditReference,
            r.movementId,
          ],
        }))}
      />
    </>
  );
}
/** Loaded purchase evidence only; this component never submits a transaction. */
function PurchaseRecords({
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
      <h3>{label}</h3>
      {!rows.length ? (
        <EmptyState
          message={`No ${label.toLowerCase()}`}
          description="Confirmed records for this order will appear here."
        />
      ) : (
        <TableScroll label={label}>
          <Table>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    data-numeric={/quantity|cost|amount|returned|damaged/i.test(c) || undefined}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {r.cells.map((cell, i) => (
                    <td
                      key={i}
                      data-numeric={
                        /quantity|cost|amount|returned|damaged/i.test(columns[i]!) || undefined
                      }
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
    </>
  );
}
