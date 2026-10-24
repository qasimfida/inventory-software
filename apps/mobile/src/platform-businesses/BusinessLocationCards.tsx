import { View } from 'react-native';
import type { Location } from '@inventory/contracts';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { StatusBadge } from '../ui/StatusBadge';
export function BusinessLocationCards({
  locations,
  onOpen,
}: {
  locations: Location[];
  onOpen: (location: Location) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.large }}>
      {(['stores', 'warehouses'] as const).map((kind) => {
        const items = locations.filter((location) => location.kind === kind);
        if (!items.length) return null;
        return (
          <View key={kind} style={{ gap: theme.spacing.small }}>
            <Text accessibilityRole="header">
              {kind === 'stores' ? 'Stores & branches' : 'Warehouses'}
            </Text>
            {items.map((location) => (
              <View
                key={location.id}
                style={{
                  padding: theme.spacing.medium,
                  gap: theme.spacing.small,
                  borderRadius: theme.radius,
                  backgroundColor: theme.tokens.secondary,
                  borderWidth: parseFloat(theme.tokens['border-width']),
                  borderColor: theme.tokens.border,
                }}
              >
                <Text tone="muted">
                  {location.type === 'branch'
                    ? 'Branch'
                    : kind === 'stores'
                      ? 'Store'
                      : 'Warehouse'}{' '}
                  · {location.code}
                </Text>
                <Action label={location.name} variant="ghost" onPress={() => onOpen(location)} />
                <StatusBadge
                  label={location.state}
                  tone={location.state === 'active' ? 'success' : 'warning'}
                />
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
