import type { createTransferClient } from '@inventory/api-client';
import { businessTime, type Location } from '@inventory/contracts';
import { RecordDetails } from '../ui/RecordDetails';
import { RecordTable } from '../ui/RecordTable';
import { EmptyState } from '../ui/AsyncState';
import { Text } from '../ui/Themed';
type Detail = Awaited<ReturnType<ReturnType<typeof createTransferClient>['detail']>>;
/** Read-only server evidence; references are never substituted with invented names. */
export function TransferDetails({
  detail,
  timeZone,
  locations = [],
}: {
  detail: Detail;
  timeZone: string | undefined;
  locations?: Location[];
}) {
  const transfer = detail.transfer;
  const warehouse = (id: string) =>
    locations.find((l) => l.id === id)?.name ?? `Warehouse reference: ${id}`;
  return (
    <>
      <RecordDetails
        label="Transfer document details"
        items={[
          { label: 'Reference', value: transfer.reference },
          { label: 'State', value: transfer.state.replaceAll('_', ' ') },
          { label: 'Source warehouse', value: warehouse(transfer.sourceWarehouseId) },
          { label: 'Destination warehouse', value: warehouse(transfer.destinationWarehouseId) },
          { label: 'Source location reference', value: transfer.sourceLocationId },
          { label: 'Destination location reference', value: transfer.destinationLocationId },
          { label: 'Created', value: businessTime(transfer.createdAt, timeZone) },
          { label: 'Version', value: String(transfer.version) },
        ]}
      />
      <Evidence
        label="Transfer lines"
        empty="No transfer lines"
        columns={[
          'Variant reference',
          'Unit reference',
          'Quantity (selected unit)',
          'Approved (base units)',
          'Settled (base units)',
        ]}
        rows={detail.lines.map((line) => ({
          id: line.id,
          cells: [line.variantId, line.unitId, line.quantity, line.baseQuantity, line.settled],
        }))}
      />
      <Evidence
        label="Receipt history"
        empty="No receipts recorded"
        columns={[
          'Receipt reference',
          'Line reference',
          'Good (base units)',
          'Damaged (base units)',
          'Shortage (base units)',
          'Reason',
          'Actor reference',
        ]}
        rows={detail.receipts.map((r) => ({
          id: r.id,
          cells: [r.id, r.lineId, r.received, r.damaged, r.shortage, r.reason, r.actorId],
        }))}
      />
      <Evidence
        label="Transfer history"
        empty="No transfer events"
        columns={['Time', 'Action', 'Actor reference', 'Reason']}
        rows={detail.events.map((event) => ({
          id: event.id,
          cells: [
            businessTime(event.createdAt, timeZone),
            event.action.replaceAll('_', ' '),
            event.actorId,
            event.reason,
          ],
        }))}
      />
    </>
  );
}
function Evidence({
  label,
  empty,
  columns,
  rows,
}: {
  label: string;
  empty: string;
  columns: string[];
  rows: { id: string; cells: string[] }[];
}) {
  return (
    <>
      <Text accessibilityRole="header">{label}</Text>
      {!rows.length ? (
        <EmptyState
          message={empty}
          description="Confirmed records will appear here when available."
        />
      ) : (
        <RecordTable label={label} columns={columns} rows={rows} />
      )}
    </>
  );
}
