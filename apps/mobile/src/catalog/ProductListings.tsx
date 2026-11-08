import type { createCatalogClient } from '@inventory/api-client';
import { hasPermission, editProductSchema } from '@inventory/contracts';
import type { Business, Location, Product } from '@inventory/contracts';
import { ProductChannels } from '../storefront/ProductChannels';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
export function ProductListings({
  business,
  locations,
  product,
  client,
  busy,
  run,
  onSaved,
}: {
  business: Business;
  locations: Location[];
  product: Product;
  client: ReturnType<typeof createCatalogClient>;
  busy: boolean;
  run: (work: () => Promise<unknown>) => void;
  onSaved: (product: Product) => void;
}) {
  const canEdit =
    hasPermission(business, 'products.write') &&
    !business.scope?.storeId &&
    product.state !== 'archived';
  const toggle = () =>
    run(async () => {
      const next = await client.edit(
        product.id,
        editProductSchema.parse({
          name: product.name,
          sku: product.sku,
          description: product.description,
          images: product.images,
          categoryId: product.categoryId,
          barcodes: product.barcodes,
          alternativeCodes: product.alternativeCodes,
          type: product.type,
          trackInventory: product.trackInventory,
          state: product.state === 'active' ? 'inactive' : 'active',
          version: product.version,
        }),
      );
      onSaved(next);
    });
  return (
    <View accessibilityLabel="Product listing availability">
      <Text accessibilityRole="header">Product listing availability</Text>
      <Text>
        Catalog / POS: {product.state}. Inactive products cannot be sold or published online. New
        products start active.
      </Text>
      {canEdit && (
        <Action
          disabled={busy}
          label={product.state === 'active' ? 'Deactivate product' : 'Activate product'}
          onPress={toggle}
        />
      )}
      {hasPermission(business, 'onlineStore.view') && (
        <ProductChannels business={business} locations={locations} productId={product.id} />
      )}
    </View>
  );
}
