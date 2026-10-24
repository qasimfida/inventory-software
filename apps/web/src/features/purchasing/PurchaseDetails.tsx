import type { createPurchasingClient } from '@inventory/api-client';
import { RecordDetails } from '@/components/common/RecordDetails';
type Detail = Awaited<ReturnType<ReturnType<typeof createPurchasingClient>['detail']>>;
export function PurchaseDetails({ detail }: { detail: Detail }) {
  return (
    <>
      <RecordDetails
        label="Purchase document"
        items={[
          { label: 'Reference', value: detail.order.reference },
          { label: 'State', value: detail.order.state },
          { label: 'Currency', value: detail.order.currency },
        ]}
      />
      {detail.lines.map((line) => (
        <RecordDetails
          key={line.id}
          label="Purchase line"
          items={[
            { label: 'Variant', value: line.variantId },
            { label: 'Ordered quantity', value: line.quantity },
            { label: 'Received quantity', value: line.received },
            { label: 'Unit cost', value: line.unitCost },
          ]}
        />
      ))}
      {detail.invoices.map((invoice) => (
        <RecordDetails
          key={invoice.id}
          label="Purchase invoice"
          items={[
            { label: 'Invoice', value: invoice.reference },
            { label: 'Original amount (minor units)', value: invoice.amountMinor },
            { label: 'Due date', value: invoice.dueDate },
          ]}
        />
      ))}
      {detail.returns.map((item) => (
        <RecordDetails
          key={item.id}
          label="Supplier return"
          items={[
            { label: 'Return quantity', value: item.quantity },
            { label: 'Damaged quantity', value: item.damaged },
            { label: 'Credit reference', value: item.creditReference },
            { label: 'Movement reference', value: item.movementId },
          ]}
        />
      ))}
    </>
  );
}
