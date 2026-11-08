import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { RecordDetails } from '@/components/common/RecordDetails';
import { RichDescription } from '@/components/common/RichDescription';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useOnlineCollection } from '../storefront/useOnlineCollection';
import { ProductChannels } from '../storefront/ProductChannels';
import { useCatalogLive } from '@/platform/useCatalogLive';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { createCatalogClient, ResourceModel, productDetailTabs } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { Button } from '@/components/ui/Button';
import { OverflowTabs } from '@/components/common/OverflowTabs';
import { ProductImage } from './ProductImage';
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
  const { posPriceLabel } = useDisplayMoney();

  const channels = useOnlineCollection([productId]);
  const [editing, setEditing] = useState(false);
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
  if (state.error) return <ErrorState message={state.error} onRetry={() => void model.run()} />;
  if (!state.data) return <LoadingState message="Loading product…" />;
  const product = state.data;
  return (
    <section className="screen-section space-y-4" aria-label="Product detail">
      <header className="space-y-1">
        <h2>{product.name}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground">{product.sku}</span>
          <StatusBadge tone={product.state === 'active' ? 'success' : 'neutral'}>
            {product.state}
          </StatusBadge>
          {channels.items.some((l) => l.status === 'active') && <StatusBadge>Online</StatusBadge>}
        </div>
      </header>
      <Tabs.Root defaultValue="Overview">
        <OverflowTabs label="Product">
          <Tabs.List className="view-tabs" aria-label="Product detail sections">
            {productDetailTabs.map((tab) => (
              <Tabs.Trigger key={tab} value={tab}>
                {tab}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </OverflowTabs>
        <Tabs.Content value="Overview" className="grid min-w-0 gap-4 lg:grid-cols-3">
          <div className="max-w-sm">
            <ProductImage product={product} />
          </div>
          <div className="min-w-0 space-y-3 lg:col-span-2">
            <RichDescription value={product.description} />
            <RecordDetails
              label="Product information"
              items={[
                {
                  label: 'Selling price / unit',
                  value: product.price ? posPriceLabel({ price: product.price }) : 'Not priced',
                },
                { label: 'Product type', value: product.type },
                {
                  label: 'Inventory tracking',
                  value: product.trackInventory ? 'Enabled' : 'Disabled',
                },
                { label: 'Barcodes', value: product.barcodes.join(', ') || 'None' },
                {
                  label: 'Alternative codes',
                  value: product.alternativeCodes.join(', ') || 'None',
                },
              ]}
            />
            {hasPermission(business, 'products.write') && product.state !== 'archived' && (
              <Button onClick={() => setEditing(true)}>Edit product details</Button>
            )}
          </div>
        </Tabs.Content>
        <Tabs.Content value="Pricing">
          <PricingPanel business={business} locations={locations} productId={productId} />
        </Tabs.Content>
        {(['Stock', 'History'] as const).map((tab) => (
          <Tabs.Content key={tab} value={tab}>
            {hasPermission(business, 'stock.read') ? (
              <ProductStock
                business={business}
                locations={locations}
                productId={productId}
                history={tab === 'History'}
              />
            ) : (
              <p>Stock viewing permission is required.</p>
            )}
          </Tabs.Content>
        ))}
        <Tabs.Content value="Channels" className="space-y-3">
          <h3>Point of sale</h3>
          <p>
            {product.state === 'active'
              ? 'Active catalog product. POS availability also requires an active variant, a valid price, warehouse access and applicable stock rules.'
              : 'This product is not active for new POS sales.'}
          </p>
          <h3>Online store</h3>
          <ProductChannels business={business} locations={locations} productId={productId} />
        </Tabs.Content>
      </Tabs.Root>
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
    </section>
  );
}
