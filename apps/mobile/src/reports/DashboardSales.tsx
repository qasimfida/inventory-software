import { View } from 'react-native';
import type { Business, DashboardSnapshot } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { dashboardGrowth } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { useTheme } from '../theme';
import { useNavigation } from '../shell/Navigation';
import { Text } from '../ui/Themed';
import { Surface } from '../ui/Surface';
import { StatusBadge } from '../ui/StatusBadge';
import { Action } from '../ui/Controls';
import { EmptyState } from '../ui/AsyncState';
import { DashboardTrend } from './DashboardTrend';
export function DashboardSales({
  data,
  business,
}: {
  data: DashboardSnapshot;
  business: Business;
}) {
  const sales = data.sales!,
    theme = useTheme(),
    { navigate } = useNavigation();
  const money = (v: string) => formatMinorUnits(v, data.currency);
  return (
    <>
      <Surface>
        <Text accessibilityRole="header">Quick POS</Text>
        <Text tone="muted">Recent confirmed sales · {data.currency}</Text>
        {hasPermission(business, 'sales.write') && (
          <Action label="Open point of sale" onPress={() => navigate('/pos')} />
        )}
        {!sales.recent.length && (
          <EmptyState message={`No sales in ${data.currency} during this period.`} />
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
          {sales.recent.slice(0, 2).map((s) => (
            <View
              key={s.id}
              style={{
                flexBasis: '45%',
                flexGrow: 1,
                padding: theme.spacing.medium,
                backgroundColor: theme.tokens.muted,
                borderRadius: theme.radius,
                gap: theme.spacing.small,
              }}
            >
              <StatusBadge
                label={s.state.replaceAll('_', ' ')}
                tone={
                  s.state === 'completed' ? 'success' : s.state === 'voided' ? 'error' : 'warning'
                }
              />
              <Text style={{ fontWeight: '600' }}>{s.name}</Text>
              <Text tone="muted">
                {s.sku} · {s.lines} lines
              </Text>
              <Text>{money(s.totalMinor)}</Text>
              <Text tone="muted">{s.createdAt.slice(0, 10)} UTC</Text>
            </View>
          ))}
        </View>
        <Text>Period orders: {sales.periodOrders}</Text>
        <Text>Gross sales: {money(sales.periodMinor)}</Text>
        <Action
          label="View sales and receipts"
          variant="ghost"
          onPress={() => navigate('/sales')}
        />
      </Surface>
      <DashboardTrend data={data} />
      <Surface>
        <Text accessibilityRole="header">Growth</Text>
        <Text tone="muted">Against the previous {sales.trend.length} UTC days</Text>
        <Text style={{ fontSize: parseFloat(theme.tokens['font-title']), fontWeight: '600' }}>
          {dashboardGrowth(sales.periodMinor, sales.previousMinor) ?? 'No prior-period comparison'}
        </Text>
        <Text>Current period: {money(sales.periodMinor)}</Text>
        <Text>Previous period: {money(sales.previousMinor)}</Text>
      </Surface>
      <Surface>
        <Text accessibilityRole="header">Top products</Text>
        <Text tone="muted">By gross sales in this period</Text>
        {!sales.topProducts.length && <EmptyState message="No product sales in this currency." />}
        {sales.topProducts.map((p) => (
          <View
            key={p.id}
            style={{ gap: theme.spacing.small, paddingVertical: theme.spacing.small }}
          >
            <Text style={{ fontWeight: '600' }}>{p.name}</Text>
            <Text tone="muted">{p.sku}</Text>
            <Text>{money(p.totalMinor)}</Text>
          </View>
        ))}
      </Surface>
    </>
  );
}
