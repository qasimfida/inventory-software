import { useState } from 'react';
import { View } from 'react-native';
import type { Location, PlatformBusiness } from '@inventory/contracts';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { SidePanel } from '../ui/SidePanel';
import { StatusBadge } from '../ui/StatusBadge';
import { useTheme } from '../theme';
import { BusinessLocations } from './BusinessLocations';
export function BusinessDirectory({
  items,
  grid,
  onManage,
}: {
  items: PlatformBusiness[];
  grid: boolean;
  onManage?: (businessId: string, location: boolean) => void;
}) {
  const theme = useTheme(),
    [expanded, setExpanded] = useState<string[]>([]),
    [selected, setSelected] = useState<{ business: PlatformBusiness; location?: Location } | null>(
      null,
    );
  return (
    <>
      <View
        style={{
          flexDirection: grid ? 'row' : 'column',
          flexWrap: 'wrap',
          gap: theme.spacing.small,
        }}
      >
        {items.map((business) => (
          <View
            key={business.id}
            style={{
              width: grid ? '47%' : '100%',
              flexGrow: 1,
              padding: theme.spacing.medium,
              borderRadius: theme.radius,
              backgroundColor: theme.colors.card,
              gap: theme.spacing.small,
            }}
          >
            <Action
              label={business.name}
              variant="ghost"
              onPress={() => setSelected({ business })}
            />
            <StatusBadge
              label={business.state}
              tone={business.state === 'active' ? 'success' : 'warning'}
            />
            <Text>{business.createdAt.slice(0, 10)} UTC</Text>
            <Text tone="muted">
              {business.storeCount ?? '—'} stores · {business.warehouseCount ?? '—'} warehouses
            </Text>
            <Action
              variant="ghost"
              label={
                grid
                  ? `View locations for ${business.name}`
                  : `${expanded.includes(business.id) ? '⌄ Hide' : '› Show'} stores & warehouses for ${business.name}`
              }
              onPress={() =>
                grid
                  ? setSelected({ business })
                  : setExpanded((old) =>
                      old.includes(business.id)
                        ? old.filter((id) => id !== business.id)
                        : [...old, business.id],
                    )
              }
            />
            {!grid && expanded.includes(business.id) && (
              <BusinessLocations
                business={business}
                onOpen={(location) => setSelected({ business, location })}
              />
            )}
          </View>
        ))}
      </View>
      <SidePanel
        title={selected?.location ? 'Location details' : 'Business details'}
        open={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            {onManage && (
              <Action
                label="Manage in business workspace"
                onPress={() => onManage?.(selected.business.id, !!selected.location)}
              />
            )}
            <Text accessibilityRole="header">
              {selected.location?.name ?? selected.business.name}
            </Text>
            <Text>Status: {selected.location?.state ?? selected.business.state}</Text>
            <Text>Business: {selected.business.name}</Text>
            <Text>Time zone: {selected.business.timeZone}</Text>
            {selected.location ? (
              <>
                <Text>Code: {selected.location.code}</Text>
                <Text>Type: {selected.location.type}</Text>
                <Text>Store reference: {selected.location.storeId ?? 'This is a store'}</Text>
              </>
            ) : (
              <>
                <Text>Registered (UTC): {selected.business.createdAt}</Text>
                {grid && (
                  <BusinessLocations
                    business={selected.business}
                    grid
                    onOpen={(location) => setSelected({ ...selected, location })}
                  />
                )}
              </>
            )}
          </>
        )}
      </SidePanel>
    </>
  );
}
