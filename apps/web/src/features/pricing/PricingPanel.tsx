import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { Table, TableScroll } from '@/components/ui/Table';
import { EmptyState } from '@/components/common/AsyncState';
import { settingsModel } from '@/platform/settings';
import { useCatalogLive } from '@/platform/useCatalogLive';
import { AccordionSection } from '@/components/ui/Accordion';
import { LoadingState } from '@/components/common/AsyncState';
import { ScreenHeader } from '@/components/common/ScreenHeader';

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createPricingClient,
  ResourceModel,
  variantForms,
  priceForms,
  quoteForm,
  immediatePriceForm,
  variantUnitSummary,
  promotionState,
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
  focusField,
  simple = true,
  onBusyChange,
}: {
  business: Business;
  productId: string;
  locations: Location[];
  focusField?: string;
  simple?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { formatMinorUnits, formatDecimalPrice } = useDisplayMoney();

  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const defaults =
    settings.businessId === business.id ? settings.business?.values.company : undefined;
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
  useEffect(() => {
    onBusyChange?.(state.busy);
  }, [state.busy, onBusyChange]);
  const [dimension, setDimension] = useState<'count' | 'mass' | 'volume' | 'length'>('count');
  const [priceSaved, setPriceSaved] = useState(false);
  const [selected, setSelected] = useState(focusField?.split('.')[1] ?? ''),
    [editing, setEditing] = useState(!!focusField),
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
      {state.error && (
        <>
          <p role="alert">{state.error}</p>
          <Button variant="ghost" disabled={state.busy} onClick={() => void model.refresh()}>
            Reload pricing
          </Button>
        </>
      )}
      {state.busy && !state.data && <LoadingState message="Loading pricing…" />}

      {simple && priceSaved && (
        <p role="status">Selling price saved. You can continue to Quantity or finish setup.</p>
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
            <p>No selling price has been saved. Set a selling price below before checkout.</p>
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
            priceForms(client, state.data, business, locations, id, defaults)
              .filter((form) => form.title === 'Publish price')
              .map((form) => (
                <CommandForm
                  inline={simple || !!focusField}
                  key={`${form.title}-${id}`}
                  definition={
                    simple ? immediatePriceForm(form, id, state.data?.prices ?? []) : form
                  }
                  run={(work) => {
                    setQuote(null);
                    setPriceSaved(false);
                    if (!model.snapshot().busy)
                      void model.run(async () => {
                        await work();
                        setPriceSaved(true);
                      }, true);
                  }}
                />
              ))}
          <AccordionSection title="Price history" defaultOpen={!simple}>
            {!state.data.prices.filter((p) => p.variantId === id).length ? (
              <EmptyState
                message="No price history"
                description="Published prices will appear here. Existing receipts keep their original price."
              />
            ) : (
              <TableScroll label="Price history">
                <Table>
                  <thead>
                    <tr>
                      {['Price', 'Scope', 'Effective from', 'Tax'].map((label) => (
                        <th key={label} scope="col" data-numeric={label === 'Price' || undefined}>
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.prices
                      .filter((p) => p.variantId === id)
                      .map((p) => (
                        <tr key={p.id}>
                          <td data-numeric>{formatDecimalPrice(p.unitPrice, p.currency)}</td>
                          <td>
                            {p.storeId
                              ? locations.find((l) => l.id === p.storeId)?.name
                              : 'Business price'}
                          </td>
                          <td>{businessTime(p.startsAt, business.timeZone)}</td>
                          <td>{p.taxInclusive ? 'Tax included' : 'Tax additional'}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </TableScroll>
            )}
          </AccordionSection>
          <AccordionSection title="Variants" defaultOpen={!!focusField}>
            <p>
              Variants belong to this product. Edit the default SKU and barcodes in Product basics
              and Images and product codes. Attributes describe an option; unit conversions define
              quantities, not separate products.
            </p>
            {state.data.variants
              .filter((v) => v.id === id)
              .map((v) => (
                <p key={v.id}>
                  {v.name} · {v.sku} · {v.state}
                  {' · '}
                  {Object.entries(v.attributes)
                    .map(([k, value]) => `${k}: ${value}`)
                    .join(', ')}
                  {' · Barcodes: '}
                  {v.barcodes.join(', ') || 'None'}
                  {v.cost !== null &&
                    v.costCurrency &&
                    ` · Cost ${formatDecimalPrice(v.cost, v.costCurrency)}`}
                </p>
              ))}
            <p>
              Stock is location-specific; use Stock &amp; movements for balances. Prices and units
              for the selected variant appear below.
            </p>
            {manage && !business.scope?.storeId && (
              <>
                {id && (
                  <Button variant="outline" onClick={() => setEditing(!editing)}>
                    {editing ? 'Create another variant' : 'Edit selected variant'}
                  </Button>
                )}
                {!editing && (
                  <>
                    <label htmlFor="variant-measurement">New variant measurement type</label>
                    <Select
                      id="variant-measurement"
                      value={dimension}
                      onChange={(e) => setDimension(e.target.value as typeof dimension)}
                    >
                      {['count', 'mass', 'volume', 'length'].map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </Select>
                  </>
                )}
                {variantForms(client, state.data, id, editing, dimension)
                  .filter((f) => f.title === 'Create variant' || f.title === 'Save variant')
                  .map((form) => (
                    <CommandForm
                      key={`${form.title}-${id}-${dimension}`}
                      definition={form}
                      run={(work) => {
                        setQuote(null);
                        if (!model.snapshot().busy) void model.run(work, true);
                      }}
                    />
                  ))}
              </>
            )}
          </AccordionSection>
          <AccordionSection title="Units and packaging">
            {variantUnitSummary(state.data, id).map((line) => (
              <p key={line}>{line}</p>
            ))}
            <p>
              Quantity precision is fixed at six decimal places. Use exact decimals such as 0.25,
              0.333 or 0.5; 0.333 is not exactly one third. Conversions that exceed precision are
              rejected, never rounded. Per-product whole-pack restrictions are not supported.
            </p>
            <p>
              Create a same-measurement unit, add its ratio, then edit the variant to choose
              purchase, selling and count defaults. For example, a tin containing 20 liters is a
              volume unit: 1 tin = 20 / 1 liters. Base units and saved ratios cannot be changed
              after creation.
            </p>
            {manage &&
              !business.scope?.storeId &&
              variantForms(client, state.data, id, editing, dimension)
                .filter(
                  (f) => f.title === 'Create unit' || (id && f.title === 'Add unit conversion'),
                )
                .map((form) => (
                  <CommandForm
                    key={`${form.title}-${id}-${dimension}`}
                    definition={form}
                    run={(work) => {
                      setQuote(null);
                      if (!model.snapshot().busy) void model.run(work, true);
                    }}
                  />
                ))}
          </AccordionSection>
          <AccordionSection title="Scheduled prices and server quote">
            <p>
              The server applies store/customer scope, effective dates and promotion priority. A
              quote is authoritative for the supplied context, not a completed sale.
            </p>
            {manage &&
              !business.scope?.warehouseId &&
              priceForms(client, state.data, business, locations, id, defaults)
                .filter((f) => f.title === 'Publish price')
                .map((f) => ({ ...f, title: 'Schedule a price' }))
                .map((form) => (
                  <CommandForm
                    key={`${form.title}-${id}-${dimension}`}
                    definition={form}
                    run={(work) => {
                      setQuote(null);
                      if (!model.snapshot().busy) void model.run(work, true);
                    }}
                  />
                ))}
            {id && (
              <CommandForm
                key={`quote-${id}`}
                definition={quoteForm(client, state.data, locations, id, setQuote)}
                run={(work) => {
                  setQuote(null);
                  if (!model.snapshot().busy) void model.run(work, true);
                }}
              />
            )}
            {quote && (
              <p role="status">
                Server price: {formatMinorUnits(quote.totalMinor, quote.currency)}; tax{' '}
                {formatMinorUnits(quote.taxMinor, quote.currency)}. This quote is not a completed
                sale.
              </p>
            )}
          </AccordionSection>
          <AccordionSection title="Promotions">
            <p>
              Published promotions become active on their start date. Drafts and editing are not
              supported; withdraw a rule before publishing its replacement.
            </p>
            {!state.data.promotions.some((p) => p.variantId === id) && (
              <p>No promotions for this variant.</p>
            )}
            {state.data.promotions
              .filter((p) => p.variantId === id)
              .map((p) => (
                <p key={p.id}>
                  {p.name} · {promotionState(p)} · {p.discountBasisPoints / 100}% · Minimum{' '}
                  {p.minimumQuantity} base units · Priority {p.priority}
                </p>
              ))}
            {manage &&
              !business.scope?.warehouseId &&
              priceForms(client, state.data, business, locations, id, defaults)
                .filter(
                  (f) =>
                    f.title === 'Publish promotion' ||
                    (f.title === 'Withdraw promotion' &&
                      state.data?.promotions.some((p) => p.variantId === id && !p.withdrawn)),
                )
                .map((form) => (
                  <CommandForm
                    key={`${form.title}-${id}-${dimension}`}
                    definition={form}
                    run={(work) => {
                      setQuote(null);
                      if (!model.snapshot().busy) void model.run(work, true);
                    }}
                  />
                ))}
          </AccordionSection>
        </>
      )}
    </section>
  );
}
