import { useCatalogLive } from '@/platform/useCatalogLive';
import { AccordionSection } from '@/components/ui/Accordion';
import { LoadingState } from '@/components/common/AsyncState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
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
  useCatalogLive(business.id, () => {
    setQuote(null);
    void model.refresh();
  });
  const id = selected || state.data?.variants[0]?.id || '',
    manage = hasPermission(business, 'products.write');
  return (
    <section aria-label="Variants and pricing" className="screen-section">
      <ScreenHeader title="Variants, units and pricing" level={3} />
      {state.error && <p role="alert">{state.error}</p>}
      {state.busy && <LoadingState message="Loading pricing…" />}

      {quote && (
        <p role="status">
          Server price: {formatMinorUnits(quote.totalMinor, quote.currency)}; tax{' '}
          {formatMinorUnits(quote.taxMinor, quote.currency)}. This quote is not a completed sale.
        </p>
      )}
      {state.data && (
        <>
          <p>
            Prices are set per sellable variant and base unit. To adjust a price, publish a new
            effective price; existing receipts keep their recorded totals.
          </p>
          {!state.data.variants.length && (
            <p>Create a variant with its stock unit below, then publish its selling price.</p>
          )}
          {state.data.variants.length > 0 && !state.data.prices.length && (
            <p>No selling price has been published. Use Publish price below before checkout.</p>
          )}
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
          {manage &&
            !business.scope?.warehouseId &&
            priceForms(client, state.data, business, locations, id)
              .filter((form) => form.title === 'Publish price')
              .map((form) => (
                <CommandForm
                  key={`${form.title}-${id}`}
                  definition={form}
                  run={(work) => {
                    setQuote(null);
                    void model.run(work);
                  }}
                />
              ))}
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
          <AccordionSection title="Variants and promotions">
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
              priceForms(client, state.data, business, locations, id)
                .filter((form) => form.title !== 'Publish price')
                .map((form) => (
                  <CommandForm
                    key={`${form.title}-${id}`}
                    definition={form}
                    run={(work) => {
                      setQuote(null);
                      void model.run(work);
                    }}
                  />
                ))}
          </AccordionSection>
        </>
      )}
    </section>
  );
}
