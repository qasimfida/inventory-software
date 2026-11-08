import { useState, type ReactNode } from 'react';
import type { Business, Location } from '@inventory/contracts';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { WarehouseSelect } from '../ui/WarehouseSelect';
import { ScrollableTabs } from '../ui/ScrollableTabs';
import { Pressable, View } from 'react-native';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { EmptyState } from '../ui/AsyncState';
import { StorageManagementPanel } from './StorageManagementPanel';
import { WarehouseViewPanel } from '../visualization/WarehouseViewPanel';
export function StoragePanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const theme = useTheme();
  const warehouses = locations.filter((location) => location.kind === 'warehouses');
  const [selected, setSelected] = useState(''),
    [tab, setTab] = useState('Locations');
  const warehouseId = warehouses.find((w) => w.id === selected)?.id ?? warehouses[0]?.id ?? '';
  const renderHeader = (actions: ReactNode) => (
    <View style={{ gap: theme.spacing.small }}>
      <ScrollableTabs label="Storage view">
        {['Locations', 'Browse hierarchy'].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
            style={{
              padding: theme.spacing.small,
              minHeight: parseFloat(theme.tokens['native-target-size']),
              justifyContent: 'center',
              borderRadius: theme.controlRadius,
              backgroundColor: tab === value ? theme.colors.card : 'transparent',
            }}
          >
            <Text>{value}</Text>
          </Pressable>
        ))}
      </ScrollableTabs>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
        {actions}
      </View>
      <WarehouseSelect
        label="Warehouse"
        value={warehouseId}
        options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
        onChange={setSelected}
      />
    </View>
  );
  return (
    <ScreenBody>
      <ScreenHeader title="Warehouse & storage" />
      {!warehouseId ? (
        <>
          {renderHeader(null)}
          <EmptyState message="No warehouses available in this workspace. Ask an administrator to add a warehouse or update your access." />
        </>
      ) : (
        <StorageManagementPanel
          key={warehouseId}
          business={business}
          locations={locations}
          warehouseId={warehouseId}
          renderHeader={renderHeader}
          renderBody={
            tab === 'Browse hierarchy'
              ? (revision) => (
                  <WarehouseViewPanel
                    key={revision}
                    page
                    business={business}
                    locations={locations}
                    warehouseId={warehouseId}
                  />
                )
              : undefined
          }
        />
      )}
    </ScreenBody>
  );
}
