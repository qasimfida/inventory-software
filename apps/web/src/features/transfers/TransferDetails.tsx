import type { createTransferClient } from '@inventory/api-client';
import { RecordDetails } from '@/components/common/RecordDetails';
import { businessTime } from '@inventory/contracts';
type Detail = Awaited<ReturnType<ReturnType<typeof createTransferClient>['detail']>>;
export function TransferDetails({
  detail,
  timeZone,
}: {
  detail: Detail;
  timeZone: string | undefined;
}) {
  return (
    <>
      <RecordDetails
        label="Transfer document details"
        items={[
          { label: 'Reference', value: detail.transfer.reference },
          { label: 'State', value: detail.transfer.state },
        ]}
      />
      {detail.lines.map((line) => (
        <RecordDetails
          key={line.id}
          label="Transfer line"
          items={[
            { label: 'Variant', value: line.variantId },
            { label: 'Approved base units', value: line.baseQuantity },
            { label: 'Settled', value: line.settled },
          ]}
        />
      ))}
      {detail.receipts.map((receipt) => (
        <RecordDetails
          key={receipt.id}
          label="Transfer receipt"
          items={[
            { label: 'Receipt', value: receipt.id },
            { label: 'Good quantity', value: receipt.received },
            { label: 'Damaged quantity', value: receipt.damaged },
            { label: 'Shortage', value: receipt.shortage },
            { label: 'Reason', value: receipt.reason },
          ]}
        />
      ))}
      {detail.events.map((event) => (
        <RecordDetails
          key={event.id}
          label="Transfer event"
          items={[
            { label: 'Time', value: businessTime(event.createdAt, timeZone) },
            { label: 'Action', value: event.action },
            { label: 'Actor', value: event.actorId },
            { label: 'Reason', value: event.reason },
          ]}
        />
      ))}
    </>
  );
}
