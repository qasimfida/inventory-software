import { useOnlineCollection } from '../storefront/useOnlineCollection';
import { ProductChannels } from '../storefront/ProductChannels';
import { useCatalogLive } from '../platform/useCatalogLive';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View, Pressable, Image } from 'react-native';
import {
  createCatalogClient,
  ResourceModel,
  productDetailTabs,
  posPriceLabel,
} from '@inventory/api-client';
import type { ProductDetailTab } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { LoadingState } from '../ui/AsyncState';
import { ScrollableTabs } from '../ui/ScrollableTabs';
import { useTheme } from '../theme';
import { ManageProduct } from './ManageProduct';
import { PricingPanel } from '../pricing/PricingPanel';
import { ProductStock } from './ProductStock';
export function ProductPage({
  business,
  locations,
  productId,
}: {
  business: Business;
  locations: Location[];
  productId: string;
}) {
  const channels = useOnlineCollection([productId]);
  const theme = useTheme(),
    [tab, setTab] = useState<ProductDetailTab>('Overview'),
    [editing, setEditing] = useState(false);
  const model = useMemo(
    () =>
      new ResourceModel(() =>
        createCatalogClient(authClient.organizationRequest, business.id).get(productId),
      ),
    [business.id, productId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useCatalogLive(business.id, () => void model.run());
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  if (state.error)
    return (
      <View>
        <Text accessibilityRole="alert">{state.error}</Text>
        <Action label="Retry product" onPress={() => void model.run()} />
      </View>
    );
  if (!state.data) return <LoadingState message="Loading product…" />;
  const product = state.data;
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">{product.name}</Text>
      {channels.items.some((l) => l.status === 'active') && <Text>Online</Text>}
      <Text>
        {product.sku} · {product.state}
      </Text>
      <ScrollableTabs label="Product">
        {productDetailTabs.map((name) => (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === name }}
            onPress={() => setTab(name)}
            style={{
              padding: theme.spacing.medium,
              borderRadius: theme.controlRadius,
              backgroundColor: tab === name ? theme.colors.card : theme.colors.background,
            }}
          >
            <Text>{name}</Text>
          </Pressable>
        ))}
      </ScrollableTabs>
      {tab === 'Overview' && (
        <View style={{ gap: theme.spacing.small }}>
          {product.images.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              accessibilityLabel={product.name}
              resizeMode="contain"
              style={{ width: '100%', height: 180, borderRadius: theme.radius }}
            />
          ))}
          <Text>{product.description || 'No description added.'}</Text>
          <Text>{product.price ? posPriceLabel({ price: product.price }) : 'Not priced'}</Text>
          <Text>
            Type: {product.type} · Inventory tracking:{' '}
            {product.trackInventory ? 'Enabled' : 'Disabled'}
          </Text>
          <Text>Barcodes: {product.barcodes.join(', ') || 'None'}</Text>
          <Text>Alternative codes: {product.alternativeCodes.join(', ') || 'None'}</Text>
          {hasPermission(business, 'products.write') && product.state !== 'archived' && (
            <Action label="Edit product details" onPress={() => setEditing(true)} />
          )}
        </View>
      )}
      {tab === 'Pricing' && (
        <PricingPanel business={business} locations={locations} productId={productId} />
      )}
      {(tab === 'Stock' || tab === 'History') &&
        (hasPermission(business, 'stock.read') ? (
          <ProductStock
            key={tab}
            business={business}
            locations={locations}
            productId={productId}
            history={tab === 'History'}
          />
        ) : (
          <Text>Stock viewing permission is required.</Text>
        ))}
      {tab === 'Channels' && (
        <View style={{ gap: theme.spacing.small }}>
          <Text accessibilityRole="header">Point of sale</Text>
          <Text>
            {product.state === 'active'
              ? 'Active catalog product. POS availability also requires an active variant, a valid price, warehouse access and applicable stock rules.'
              : 'This product is not active for new POS sales.'}
          </Text>
          <Text accessibilityRole="header">Online store</Text>
          <ProductChannels business={business} locations={locations} productId={productId} />
        </View>
      )}
      {editing && (
        <ManageProduct
          business={business}
          locations={locations}
          productId={productId}
          onClose={() => {
            setEditing(false);
            void model.run();
          }}
        />
      )}
    </View>
  );
}
