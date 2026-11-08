import { useDisplayMoney } from '../ui/useDisplayMoney';
import { RecordTable } from '../ui/RecordTable';
import { EmptyState } from '../ui/AsyncState';
import { settingsModel } from '../settings/model';
import { useCatalogLive } from '../platform/useCatalogLive';
import { FormSection } from '../ui/FormSection';
import { LoadingState } from '../ui/AsyncState';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';

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
import { authClient } from '../auth/client';
import { CommandForm } from '../components/CommandForm';
import { Action, Choice } from '../organization/Controls';
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
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
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
    <ScreenBody>
      <ScreenHeader title="Variants, units and pricing" />
      {Boolean(state.error) && (
        <>
          <Text accessibilityRole="alert">{state.error}</Text>
          <Action
            label="Reload pricing"
            disabled={state.busy}
            onPress={() => void model.refresh()}
          />
        </>
      )}
      {state.busy && !state.data && <LoadingState message="Loading pricing…" />}

      {simple && priceSaved && (
        <Text accessibilityLiveRegion="polite">
          Selling price saved. You can continue to Quantity or finish setup.
        </Text>
      )}
      {state.data && (
        <>
          <Text>
            Prices are set per sellable variant and base unit. To adjust a price, publish a new
            effective price; existing receipts keep their recorded totals.
          </Text>
          {!state.data.variants.length && (
            <Text>Create a variant with its stock unit below, then publish its selling price.</Text>
          )}
          {state.data.variants.length > 0 && !state.data.prices.length && (
            <Text>No selling price has been saved. Set a selling price below before checkout.</Text>
          )}
          <Choice
            label="Selected variant"
            value={id}
            onChange={(value) => {
              setSelected(value);
              setQuote(null);
            }}
            options={state.data.variants.map((v) => ({
              value: v.id,
              label: `${v.sku} · ${v.name} · ${v.state}`,
            }))}
          />
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
          <FormSection title="Price history" defaultOpen={!simple}>
            {!state.data.prices.filter((p) => p.variantId === id).length ? (
              <EmptyState
                message="No price history"
                description="Published prices will appear here. Existing receipts keep their original price."
              />
            ) : (
              <RecordTable
                label="Price history"
                columns={['Price', 'Scope', 'Effective from', 'Tax']}
                rows={state.data.prices
                  .filter((p) => p.variantId === id)
                  .map((p) => ({
                    id: p.id,
                    cells: [
                      formatDecimalPrice(p.unitPrice, p.currency),
                      p.storeId
                        ? (locations.find((l) => l.id === p.storeId)?.name ?? p.storeId)
                        : 'Business price',
                      businessTime(p.startsAt, business.timeZone),
                      p.taxInclusive ? 'Tax included' : 'Tax additional',
                    ],
                  }))}
              />
            )}
          </FormSection>
          <FormSection title="Variants" defaultOpen={!!focusField}>
            <Text>
              Variants belong to this product. Edit the default SKU and barcodes in Product basics
              and Images and product codes. Attributes describe an option; unit conversions define
              quantities, not separate products.
            </Text>
            {state.data.variants
              .filter((v) => v.id === id)
              .map((v) => (
                <Text key={v.id}>
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
                </Text>
              ))}
            <Text>
              Stock is location-specific; use Stock &amp; movements for balances. Prices and units
              for the selected variant appear below.
            </Text>
            {manage && !business.scope?.storeId && (
              <>
                {id && (
                  <Action
                    label={editing ? 'Create another variant' : 'Edit selected variant'}
                    onPress={() => setEditing(!editing)}
                  />
                )}
                {!editing && (
                  <Choice
                    label="New variant measurement type"
                    value={dimension}
                    onChange={(v) => setDimension(v as typeof dimension)}
                    options={['count', 'mass', 'volume', 'length'].map((d) => ({
                      value: d,
                      label: d,
                    }))}
                  />
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
          </FormSection>
          <FormSection title="Units and packaging">
            {variantUnitSummary(state.data, id).map((line) => (
              <Text key={line}>{line}</Text>
            ))}
            <Text>
              Quantity precision is fixed at six decimal places. Use exact decimals such as 0.25,
              0.333 or 0.5; 0.333 is not exactly one third. Conversions that exceed precision are
              rejected, never rounded. Per-product whole-pack restrictions are not supported.
            </Text>
            <Text>
              Create a same-measurement unit, add its ratio, then edit the variant to choose
              purchase, selling and count defaults. For example, a tin containing 20 liters is a
              volume unit: 1 tin = 20 / 1 liters. Base units and saved ratios cannot be changed
              after creation.
            </Text>
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
          </FormSection>
          <FormSection title="Scheduled prices and server quote">
            <Text>
              The server applies store/customer scope, effective dates and promotion priority. A
              quote is authoritative for the supplied context, not a completed sale.
            </Text>
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
              <Text accessibilityLiveRegion="polite">
                Server price: {formatMinorUnits(quote.totalMinor, quote.currency)}; tax{' '}
                {formatMinorUnits(quote.taxMinor, quote.currency)}. This quote is not a completed
                sale.
              </Text>
            )}
          </FormSection>
          <FormSection title="Promotions">
            <Text>
              Published promotions become active on their start date. Drafts and editing are not
              supported; withdraw a rule before publishing its replacement.
            </Text>
            {!state.data.promotions.some((p) => p.variantId === id) && (
              <Text>No promotions for this variant.</Text>
            )}
            {state.data.promotions
              .filter((p) => p.variantId === id)
              .map((p) => (
                <Text key={p.id}>
                  {p.name} · {promotionState(p)} · {p.discountBasisPoints / 100}% · Minimum{' '}
                  {p.minimumQuantity} base units · Priority {p.priority}
                </Text>
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
          </FormSection>
        </>
      )}
    </ScreenBody>
  );
}
