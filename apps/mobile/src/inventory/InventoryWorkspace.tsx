import { useNavigation } from '../shell/Navigation';
import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { hasPermission, type Business, type Location } from '@inventory/contracts';
import { ScrollableTabs } from '../ui/ScrollableTabs';
import { Text } from '../ui/Themed';
import { metrics } from '../ui/metrics';
import { useTheme } from '../theme';
import { CatalogPanel } from '../catalog/CatalogPanel';
import { InventoryPanel } from './InventoryPanel';
export function InventoryWorkspace({
  business,
  locations,
  initialSearch,
}: {
  business: Business;
  locations: Location[];
  initialSearch?: string | undefined;
  page?: boolean;
}) {
  const theme = useTheme();
  const { stock: stockFilter, navigate } = useNavigation();
  const products = hasPermission(business, 'products.read');
  const stock = hasPermission(business, 'stock.read');
  const [section, setSection] = useState('Products & pricing');
  const [previousSearch, setPreviousSearch] = useState(initialSearch);
  if (previousSearch !== initialSearch) {
    setPreviousSearch(initialSearch);
    if (initialSearch !== undefined) setSection('Products & pricing');
  }
  if (business.state !== 'active' || (!products && !stock)) return null;
  const selected =
    products && (!stock || (!stockFilter && section === 'Products & pricing'))
      ? 'Products & pricing'
      : 'Stock & movements';
  return (
    <View style={{ gap: theme.spacing.small }}>
      {products && stock && (
        <ScrollableTabs label="Inventory">
          {['Products & pricing', 'Stock & movements'].map((name) => (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityState={{ selected: selected === name }}
              onPress={() => {
                setSection(name);
                if (name === 'Products & pricing' && stockFilter) navigate('/inventory');
              }}
              style={{
                minHeight: metrics.target,
                justifyContent: 'center',
                paddingHorizontal: theme.spacing.medium,
                borderRadius: theme.controlRadius,
                backgroundColor: selected === name ? theme.tokens.card : 'transparent',
              }}
            >
              <Text>{name}</Text>
            </Pressable>
          ))}
        </ScrollableTabs>
      )}
      {selected === 'Products & pricing' ? (
        <CatalogPanel business={business} locations={locations} initialSearch={initialSearch} />
      ) : (
        <InventoryPanel business={business} locations={locations} />
      )}
    </View>
  );
}
