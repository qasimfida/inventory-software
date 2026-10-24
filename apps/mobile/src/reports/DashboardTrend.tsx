import { useState } from 'react';
import { View } from 'react-native';
import type { DashboardSnapshot } from '@inventory/contracts';
import { dashboardHeights } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { Surface } from '../ui/Surface';
import { Action } from '../ui/Controls';
import { DataRow } from '../ui/DataRow';
export function DashboardTrend({ data }: { data: DashboardSnapshot }) {
  const theme = useTheme(),
    [expanded, setExpanded] = useState(false),
    sales = data.sales!;
  const heights = dashboardHeights(sales.trend.map((p) => p.totalMinor));
  return (
    <Surface>
      <Text accessibilityRole="header">Sales trend</Text>
      <Text tone="muted">
        {data.from} – {data.to} UTC
      </Text>
      <Text>{formatMinorUnits(sales.periodMinor, data.currency)}</Text>
      <View
        accessible
        accessibilityLabel={`Daily gross sales in ${data.currency}. Use View daily figures for exact values.`}
        style={{
          height: theme.spacing.large * 6,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.small / 2,
        }}
      >
        {heights.map((h, i) => (
          <View
            key={sales.trend[i]!.date}
            style={{
              height: `${h}%`,
              flex: 1,
              backgroundColor: theme.colors.primary,
              borderTopLeftRadius: theme.radius,
              borderTopRightRadius: theme.radius,
            }}
          />
        ))}
      </View>
      <Action
        label={expanded ? 'Hide daily figures' : 'View daily figures'}
        variant="ghost"
        onPress={() => setExpanded(!expanded)}
      />
      {expanded &&
        sales.trend.map((p) => (
          <DataRow
            key={p.date}
            label={p.date}
            value={formatMinorUnits(p.totalMinor, data.currency)}
            unit="gross sales"
          />
        ))}
    </Surface>
  );
}
