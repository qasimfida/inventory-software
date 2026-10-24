import { View } from 'react-native';
import type { PlatformOverview } from '@inventory/contracts';
import { dashboardHeights } from '@inventory/api-client';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { Surface } from '../ui/Surface';
export function RegistrationTrend({ rows }: { rows: PlatformOverview['registrations'] }) {
  const theme = useTheme();
  const heights = dashboardHeights(rows.map((r) => r.count));
  return (
    <Surface>
      <Text accessibilityRole="header">Business registrations</Text>
      <Text tone="muted">Last 30 days · UTC</Text>
      <View
        accessible
        accessibilityLabel={`Daily registrations. ${rows.map((row) => `${row.date}: ${row.count}`).join('; ')}`}
        style={{
          height: theme.spacing.large * 6,
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: theme.spacing.small / 2,
        }}
      >
        {rows.map((r, i) => (
          <View
            key={r.date}
            style={{
              height: `${heights[i]}%`,
              flex: 1,
              backgroundColor: theme.colors.primary,
              borderTopLeftRadius: theme.radius,
              borderTopRightRadius: theme.radius,
            }}
          />
        ))}
      </View>
      {!rows.length && <Text>No registration history available.</Text>}
    </Surface>
  );
}
