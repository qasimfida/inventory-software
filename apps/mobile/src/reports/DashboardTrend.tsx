import { useDisplayMoney } from '../ui/useDisplayMoney';
import { ChartPresentation } from '../ui/ChartPresentation';
import { RecordTable } from '../ui/RecordTable';
import { View } from 'react-native';
import type { DashboardSnapshot } from '@inventory/contracts';
import { dashboardHeights } from '@inventory/api-client';

import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { Surface } from '../ui/Surface';
export function DashboardTrend({ data }: { data: DashboardSnapshot }) {
  const { formatMinorUnits } = useDisplayMoney();

  const theme = useTheme(),
    sales = data.sales!;
  const heights = dashboardHeights(sales.trend.map((p) => p.totalMinor));
  return (
    <Surface>
      <Text accessibilityRole="header">Sales trend</Text>
      <Text tone="muted">
        {data.from} – {data.to} UTC
      </Text>
      <Text>{formatMinorUnits(sales.periodMinor, data.currency)}</Text>
      <ChartPresentation
        label="Trend chart"
        values={
          <RecordTable
            label="Daily sales values"
            columns={['Date (UTC)', 'Gross sales']}
            rows={sales.trend.map((row) => ({
              id: row.date,
              cells: [row.date, formatMinorUnits(row.totalMinor, data.currency)],
            }))}
          />
        }
      >
        <View
          style={{
            height: theme.spacing.large * (theme.preferences.charts === 'charts' ? 9 : 6),
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: theme.spacing.small / 2,
          }}
        >
          {heights.map((h, i) => (
            <View
              key={sales.trend[i]!.date}
              accessible
              accessibilityLabel={`${sales.trend[i]!.date}: ${formatMinorUnits(sales.trend[i]!.totalMinor, data.currency)} gross sales`}
              accessibilityRole="image"
              style={{
                height: `${h}%`,
                flex: 1,
                backgroundColor: theme.tokens['chart-1'],
                borderTopLeftRadius: theme.radius,
                borderTopRightRadius: theme.radius,
              }}
            />
          ))}
        </View>
      </ChartPresentation>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text tone="muted">{data.from}</Text>
        <Text tone="muted">{data.to}</Text>
      </View>
    </Surface>
  );
}
