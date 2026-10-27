import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createCatalogClient, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { FormSheet } from '@/components/common/FormSheet';
import { ErrorState, LoadingState } from '@/components/common/AsyncState';
import { ProductEditor } from './ProductEditor';
import { PricingPanel } from '../pricing/PricingPanel';
/** Existing catalog commands, opened in place from inventory without changing the active warehouse. */
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
      <FormSheet
        title="Variants and pricing"
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <PricingPanel
          business={business}
          locations={locations}
          productId={productId}
          {...(focusField ? { focusField } : {})}
        />
      </FormSheet>
    );
  if (!state.data)
    return (
      <FormSheet
        title="Edit product details"
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        {state.error ? (
          <ErrorState message={state.error} onRetry={() => void model.run()} />
        ) : (
          <LoadingState message="Loading product details…" />
        )}
      </FormSheet>
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
