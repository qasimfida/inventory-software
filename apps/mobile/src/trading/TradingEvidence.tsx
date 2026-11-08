import { View } from 'react-native';
import type { TradingOrder, TradingRelationship } from '@inventory/contracts';
import { businessTime } from '@inventory/contracts';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { RecordDetails } from '../ui/RecordDetails';
import { RecordTable } from '../ui/RecordTable';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/AsyncState';
export function TradingRelationships({ items }: { items: TradingRelationship[] }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text accessibilityRole="header">Trading relationships</Text>
      {!items.length ? (
        <EmptyState
          message="No trading relationships"
          description="Ask a partner owner for their business ID, then use Invite trading partner."
        />
      ) : (
        <RecordTable
          label="Trading relationships"
          columns={[
            'Relationship reference',
            'Proposing business reference',
            'Partner business reference',
            'Status',
          ]}
          rows={items.map((r) => ({
            id: r.id,
            cells: [
              r.id,
              r.proposerId,
              r.partnerId,
              <StatusBadge
                key="state"
                tone={
                  r.state === 'active' ? 'success' : r.state === 'pending' ? 'warning' : 'neutral'
                }
                label={r.state[0]!.toUpperCase() + r.state.slice(1)}
              />,
            ],
          }))}
        />
      )}
    </View>
  );
}
export function TradingDetails({
  order,
  timeZone,
}: {
  order: TradingOrder;
  timeZone: string | undefined;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.medium }}>
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
      <Text accessibilityRole="header">Shared order lines</Text>
      <RecordTable
        label="Shared order lines"
        columns={[
          'Description',
          'Quantity',
          'Agreed unit',
          `Unit price (${order.currency} minor units)`,
        ]}
        rows={order.lines.map((l, i) => ({
          id: String(i),
          cells: [
            l.description,
            <Text key="quantity" style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>
              {l.quantity}
            </Text>,
            l.unit,
            <Text key="price" style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>
              {l.unitPriceMinor}
            </Text>,
          ],
        }))}
      />
      <Text tone="muted">
        Shared terms only. Record sales and purchase receipts separately to change stock and
        balances.
      </Text>
    </View>
  );
}
