import { View } from 'react-native';
import type { DashboardSnapshot } from '@inventory/contracts';
import { formatMinorUnits } from '@inventory/domain';
import { dashboardGrowth } from '@inventory/api-client';
import { useTheme } from '../theme';
import { useNavigation } from '../shell/Navigation';
import { Text } from '../ui/Themed';
import { MetricCard } from '../ui/MetricCard';
import { Surface } from '../ui/Surface';
import { StatusBadge } from '../ui/StatusBadge';
import { Action } from '../ui/Controls';
import { EmptyState } from '../ui/AsyncState';
export function DashboardMetrics({ data }: { data: DashboardSnapshot }) {
  const theme = useTheme(),
    { navigate } = useNavigation(),
    sales = data.sales;
  const money = (v: string) => formatMinorUnits(v, data.currency);
  const growth = sales ? dashboardGrowth(sales.todayMinor, sales.yesterdayMinor) : null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.medium }}>
      {sales && (
        <>
          <MetricCard
            label="Sales today"
            value={money(sales.todayMinor)}
            primary
            unit={
              growth
                ? `${growth} vs yesterday · gross sales`
                : 'Gross sales · no prior-day comparison'
            }
          />
          <MetricCard
            label="Orders today"
            value={sales.todayOrders}
            unit="Confirmed sale transactions"
          />
          <MetricCard
            label="Average basket"
            value={money(sales.averageBasketMinor)}
            unit="Today · rounded to currency minor unit"
            tone="destructive"
          />
        </>
      )}
      {data.inventory && (
        <View style={{ flexGrow: 1, gap: theme.spacing.small }}>
          <MetricCard
            label="Low stock"
            value={`${data.inventory.lowStock} SKUs`}
            unit={`${data.inventory.outOfStock} out of stock · threshold ${data.inventory.threshold}`}
            tone="warning"
          />
          <Action
            label="View low stock"
            variant="ghost"
            onPress={() => navigate('/inventory?stock=low-stock')}
          />
        </View>
      )}
    </View>
  );
}
export function DashboardStock({
  inventory,
}: {
  inventory: NonNullable<DashboardSnapshot['inventory']>;
}) {
  const theme = useTheme(),
    { navigate } = useNavigation();
  return (
    <Surface>
      <Text accessibilityRole="header">Inventory snapshot</Text>
      <Text tone="muted">Available units across your authorized warehouses.</Text>
      {!inventory.items.length && <EmptyState message="No active inventory products." />}
      {inventory.items.slice(0, 4).map((p) => (
        <View
          key={p.id}
          style={{
            backgroundColor: theme.tokens.muted,
            borderRadius: theme.radius,
            padding: theme.spacing.medium,
            gap: theme.spacing.small,
          }}
        >
          <Text style={{ fontWeight: '600' }}>{p.name}</Text>
          <Text tone="muted">{p.sku}</Text>
          <Text>
            Available: {p.available} {p.unit}
          </Text>
          <StatusBadge
            label={
              p.status === 'in-stock'
                ? 'In stock'
                : p.status === 'low-stock'
                  ? 'Low stock'
                  : 'Out of stock'
            }
            tone={
              p.status === 'in-stock' ? 'success' : p.status === 'low-stock' ? 'warning' : 'error'
            }
          />
        </View>
      ))}
      <Action label="View all inventory" variant="ghost" onPress={() => navigate('/inventory')} />
    </Surface>
  );
}
