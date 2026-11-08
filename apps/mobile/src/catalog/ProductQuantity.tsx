import { useEffect, useMemo, useState } from 'react';
import {
  createInventoryClient,
  createPricingClient,
  productQuantityForm,
} from '@inventory/api-client';
import { hasPermission, type Business, type Location, type Product } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { CommandForm } from '../components/CommandForm';
import { Action } from '../ui/Controls';
export function ProductQuantity({
  business,
  locations,
  product,
  opening,
  run,
  busy,
}: {
  business: Business;
  locations: Location[];
  product: Product;
  opening: boolean;
  busy: boolean;
  run: (work: () => Promise<unknown>) => void;
}) {
  const client = useMemo(
    () => createInventoryClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const pricing = useMemo(
    () => createPricingClient(authClient.organizationRequest, business.id, product.id),
    [business.id, product.id],
  );
  const [data, setData] = useState<Awaited<ReturnType<typeof pricing.load>> | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [error, setError] = useState(''),
    [retry, setRetry] = useState(0),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    let active = true;
    void pricing
      .load()
      .then((value) => {
        if (active) {
          setData(value);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Unable to load stock units. Retry when connected.');
      });
    return () => {
      active = false;
    };
  }, [pricing, retry]);
  if (!hasPermission(business, 'stock.write'))
    return <Text>You do not have permission to change stock quantities.</Text>;
  if (!product.trackInventory || product.type === 'service')
    return <Text>This product does not track stock quantities.</Text>;
  if (product.state !== 'active') return <Text>Activate this product before adding stock.</Text>;
  if (!locations.some((l) => l.kind === 'warehouses' && l.state === 'active'))
    return (
      <Text>
        Add or select an active warehouse before recording quantity. Product details remain saved.
      </Text>
    );
  if (error)
    return (
      <>
        <Text>{error}</Text>
        <Action
          label="Retry"
          onPress={() => {
            setError('');
            setRetry((n) => n + 1);
          }}
        />
      </>
    );
  if (!data) return <Text>Loading stock units…</Text>;
  if (!data.variants.some((v) => v.state === 'active'))
    return <Text>Add an active variant in Price & units before recording quantity.</Text>;
  return (
    <View accessibilityLabel="Product quantity">
      <Text>
        Enter the number of units to{' '}
        {opening && !recorded ? 'add as opening stock' : 'add or remove'}, not a replacement total.
        This records a stock movement at the warehouse root. Use Stock & movements for specific bins
        or counts.
      </Text>
      {saved ? (
        <>
          <Text>Quantity saved. The stock movement is recorded.</Text>
          <Action
            label="Record another quantity change"
            disabled={busy}
            onPress={() => setSaved(false)}
          />
        </>
      ) : (
        <View pointerEvents={busy ? 'none' : 'auto'} accessibilityState={{ disabled: busy }}>
          <CommandForm
            inline
            definition={productQuantityForm(client, data, locations, opening && !recorded)}
            run={(work) =>
              run(async () => {
                await work();
                setSaved(true);
                setRecorded(true);
              })
            }
          />
        </View>
      )}
    </View>
  );
}
