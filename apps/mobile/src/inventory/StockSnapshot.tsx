import { EmptyState } from '../ui/AsyncState';
import { useTheme } from '../theme';
import { View } from 'react-native';
import type { createInventoryClient } from '@inventory/api-client';
import { Text } from '../ui/Themed';
import { Surface } from '../ui/Surface';
import { MetricCard } from '../ui/MetricCard';
type Stock = Awaited<ReturnType<ReturnType<typeof createInventoryClient>['load']>>;
export function StockSnapshot({ stock }: { stock: Stock }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <MetricCard
        label="Balance records"
        value={String(stock.totals.balances)}
        unit="Within the current warehouse and search"
        primary
      />
      <Text accessibilityRole="header">Inventory snapshot</Text>
      {!stock.balances.length && (
        <EmptyState message="No stock balances match this warehouse and search." />
      )}
      {stock.balances.map((b) => (
        <Surface key={`${b.variantId}-${b.locationId}`}>
          <Text style={{ fontWeight: '600' }}>{b.sku}</Text>
          <Text tone="muted">
            {b.locationName} ·{' '}
            {stock.units.find(
              (unit) => unit.id === stock.items.find((item) => item.id === b.variantId)?.baseUnitId,
            )?.code ?? 'Base unit'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.medium }}>
            {[
              ['On hand', b.onHand],
              ['Reserved', b.reserved],
              ['Damaged', b.damaged],
              ['Available', b.available],
              ['In transit', b.inTransit],
            ].map(([label, value]) => (
              <View key={label} style={{ minWidth: 100, flexGrow: 1, gap: theme.spacing.small }}>
                <Text
                  tone="muted"
                  style={{ fontSize: Number.parseFloat(theme.tokens['font-label']) }}
                >
                  {label}
                </Text>
                <Text style={{ fontWeight: '600', fontVariant: ['tabular-nums'] }}>{value}</Text>
              </View>
            ))}
          </View>
        </Surface>
      ))}
    </View>
  );
}
