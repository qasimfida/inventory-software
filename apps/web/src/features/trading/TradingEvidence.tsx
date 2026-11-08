import type { TradingOrder, TradingRelationship } from '@inventory/contracts';
import { businessTime } from '@inventory/contracts';
import { RecordDetails } from '@/components/common/RecordDetails';
import { Table, TableScroll } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/common/AsyncState';
export function TradingRelationships({ items }: { items: TradingRelationship[] }) {
  return (
    <section className="min-w-0 space-y-2">
      <h3>Trading relationships</h3>
      {!items.length ? (
        <EmptyState
          message="No trading relationships"
          description="Ask a partner owner for their business ID, then use Invite trading partner."
        />
      ) : (
        <TableScroll label="Trading relationships">
          <Table>
            <thead>
              <tr>
                <th scope="col">Relationship reference</th>
                <th scope="col">Proposing business reference</th>
                <th scope="col">Partner business reference</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}</td>
                  <td>{r.proposerId}</td>
                  <td>{r.partnerId}</td>
                  <td>
                    <StatusBadge
                      tone={
                        r.state === 'active'
                          ? 'success'
                          : r.state === 'pending'
                            ? 'warning'
                            : 'neutral'
                      }
                    >
                      {r.state[0]!.toUpperCase() + r.state.slice(1)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      )}
    </section>
  );
}
export function TradingDetails({
  order,
  timeZone,
}: {
  order: TradingOrder;
  timeZone: string | undefined;
}) {
  return (
    <div className="min-w-0 shrink-0 space-y-3">
      <RecordDetails
        label="Shared order metadata"
        items={[
          { label: 'Order reference', value: order.reference },
          { label: 'Status', value: order.state[0]!.toUpperCase() + order.state.slice(1) },
          { label: 'Buyer business reference', value: order.buyerId },
          { label: 'Seller business reference', value: order.sellerId },
          { label: 'Currency', value: order.currency },
          { label: 'Created at', value: businessTime(order.createdAt, timeZone) },
          { label: 'Relationship reference', value: order.relationshipId },
          { label: 'Record reference', value: order.id },
        ]}
      />
      <h3>Shared order lines</h3>
      <TableScroll label="Shared order lines">
        <Table>
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col" data-numeric>
                Quantity
              </th>
              <th scope="col">Agreed unit</th>
              <th scope="col" data-numeric>
                Unit price ({order.currency} minor units)
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l, i) => (
              <tr key={i}>
                <th scope="row">{l.description}</th>
                <td data-numeric>{l.quantity}</td>
                <td>{l.unit}</td>
                <td data-numeric>{l.unitPriceMinor}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
      <p className="text-sm text-muted-foreground">
        Shared terms only. Record sales and purchase receipts separately to change stock and
        balances.
      </p>
    </div>
  );
}
