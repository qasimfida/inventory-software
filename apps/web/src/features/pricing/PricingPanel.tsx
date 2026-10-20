import { formatMinorUnits } from '@inventory/api-client';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createPricingClient,
  ResourceModel,
  variantForms,
  priceForms,
  quoteForm,
} from '@inventory/api-client';
import { hasPermission, businessTime } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { CommandForm } from '@/components/common/CommandForm';
import { Select } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function PricingPanel({
  business,
  productId,
  locations,
}: {
  business: Business;
  productId: string;
  locations: Location[];
}) {
  const client = useMemo(
    () => createPricingClient(authClient.organizationRequest, business.id, productId),
    [business.id, productId],
  );
  const model = useMemo(() => new ResourceModel(client.load), [client]);
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  const [selected, setSelected] = useState(''),
    [editing, setEditing] = useState(false),
    [quote, setQuote] = useState<Awaited<ReturnType<typeof client.quote>> | null>(null);
  const id = selected || state.data?.variants[0]?.id || '',
    manage = hasPermission(business, 'products.write');
  return (
    <section aria-label="Variants and pricing" className="space-y-3 border p-3">
      <h3>Variants, units and pricing</h3>
      {state.error && <p role="alert">{state.error}</p>}
      {state.busy && <p role="status">Loading pricing…</p>}
      <Button
        disabled={state.busy}
        onClick={() => {
          setQuote(null);
          void model.run();
        }}
      >
        Refresh pricing
      </Button>
      {quote && (
        <p role="status">
          Server price: {formatMinorUnits(quote.totalMinor, quote.currency)}; tax{' '}
          {formatMinorUnits(quote.taxMinor, quote.currency)}. This quote is not a completed sale.
        </p>
      )}
      {state.data && (
        <>
          <label htmlFor="pricing-variant">Selected variant</label>
          <Select
            id="pricing-variant"
            value={id}
            onChange={(e) => {
              setSelected(e.target.value);
              setQuote(null);
            }}
          >
            {state.data.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.sku} · {v.name} · {v.state}
              </option>
            ))}
          </Select>
          <ul>
            {state.data.variants.map((v) => (
              <li key={v.id}>
                {v.name} · {v.sku} ·{' '}
                {Object.entries(v.attributes)
                  .map(([k, value]) => `${k}: ${value}`)
                  .join(', ')}
                {v.cost !== null && ` · cost ${v.cost} ${v.costCurrency}`}
              </li>
            ))}
          </ul>
          <ul>
            {state.data.prices.map((p) => (
              <li key={p.id}>
                {p.unitPrice} {p.currency} ·{' '}
                {p.storeId ? locations.find((l) => l.id === p.storeId)?.name : 'Business price'} ·
                from {businessTime(p.startsAt, business.timeZone)} ·{' '}
                {p.taxInclusive ? 'tax included' : 'tax additional'}
              </li>
            ))}
          </ul>
          <ul>
            {state.data.promotions.map((p) => (
              <li key={p.id}>
                {p.name} · {p.discountBasisPoints / 100}% · priority {p.priority}
              </li>
            ))}
          </ul>
          <CommandForm
            key={`quote-${id}`}
            definition={quoteForm(client, state.data, locations, id, setQuote)}
            run={(work) => {
              setQuote(null);
              void model.run(work);
            }}
          />
          {manage && !business.scope?.storeId && (
            <>
              <Button variant="outline" onClick={() => setEditing(!editing)}>
                {editing ? 'Add new variant' : 'Edit selected variant'}
              </Button>
              {variantForms(client, state.data, id, editing).map((form) => (
                <CommandForm
                  key={`${form.title}-${id}`}
                  definition={form}
                  run={(work) => {
                    setQuote(null);
                    void model.run(work);
                  }}
                />
              ))}
            </>
          )}
          {manage &&
            !business.scope?.warehouseId &&
            priceForms(client, state.data, business, locations, id).map((form) => (
              <CommandForm
                key={`${form.title}-${id}`}
                definition={form}
                run={(work) => {
                  setQuote(null);
                  void model.run(work);
                }}
              />
            ))}
        </>
      )}
    </section>
  );
}
