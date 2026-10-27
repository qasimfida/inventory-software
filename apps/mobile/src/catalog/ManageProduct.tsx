import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createCatalogClient, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { ProductEditor } from './ProductEditor';
import { PricingPanel } from '../pricing/PricingPanel';
export function ManageProduct({
  business,
  locations,
  productId,
  onClose,
  focusField,
}: {
  business: Business;
  locations: Location[];
  productId: string;
  onClose: () => void;
  focusField?: string;
}) {
  const [pricing, setPricing] = useState(!!focusField?.startsWith('variants'));
  const client = useMemo(
    () => createCatalogClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        product: await client.get(productId),
        categories: await client.categories(),
      })),
    [client, productId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  if (pricing)
    return (
      <SidePanel title="Variants and pricing" open onClose={onClose}>
        <PricingPanel
          business={business}
          locations={locations}
          productId={productId}
          {...(focusField ? { focusField } : {})}
        />
      </SidePanel>
    );
  if (!state.data)
    return (
      <SidePanel title="Edit product details" open onClose={onClose}>
        <Text>{state.error || 'Loading product details…'}</Text>
        {!!state.error && <Action label="Retry" onPress={() => void model.run()} />}
      </SidePanel>
    );
  return (
    <ProductEditor
      {...(focusField ? { focusField } : {})}
      product={state.data.product}
      categories={state.data.categories}
      client={client}
      onClose={onClose}
      onSaved={onClose}
      onPricing={() => setPricing(true)}
    />
  );
}
