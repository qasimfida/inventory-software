import { useEffect, useMemo, useState } from 'react';
import {
  createInventoryClient,
  createPricingClient,
  productQuantityForm,
} from '@inventory/api-client';
import { hasPermission, type Business, type Location, type Product } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
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
    () =>
      createInventoryClient(authClient.organizationRequest, () => crypto.randomUUID(), business.id),
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
    return <p>You do not have permission to change stock quantities.</p>;
  if (!product.trackInventory || product.type === 'service')
    return <p>This product does not track stock quantities.</p>;
  if (product.state !== 'active') return <p>Activate this product before adding stock.</p>;
  if (!locations.some((l) => l.kind === 'warehouses' && l.state === 'active'))
    return (
      <p>
        Add or select an active warehouse before recording quantity. Product details remain saved.
      </p>
    );
  if (error)
    return (
      <>
        <p role="alert">{error}</p>
        <Button
          onClick={() => {
            setError('');
            setRetry((n) => n + 1);
          }}
        >
          Retry
        </Button>
      </>
    );
  if (!data) return <p role="status">Loading stock units…</p>;
  if (!data.variants.some((v) => v.state === 'active'))
    return <p>Add an active variant in Price & units before recording quantity.</p>;
  return (
    <section className="space-y-3" aria-label="Product quantity">
      <p>
        Enter the number of units to{' '}
        {opening && !recorded ? 'add as opening stock' : 'add or remove'}, not a replacement total.
        This records a stock movement at the warehouse root. Use Stock & movements for specific bins
        or counts.
      </p>
      {saved ? (
        <>
          <p role="status">Quantity saved. The stock movement is recorded.</p>
          <Button variant="outline" disabled={busy} onClick={() => setSaved(false)}>
            Record another quantity change
          </Button>
        </>
      ) : (
        <fieldset disabled={busy}>
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
        </fieldset>
      )}
    </section>
  );
}
