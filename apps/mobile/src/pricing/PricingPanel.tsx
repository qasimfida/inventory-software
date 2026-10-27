import { settingsModel } from '../settings/model';
import { useCatalogLive } from '../platform/useCatalogLive';
import { FormSection } from '../ui/FormSection';
import { LoadingState } from '../ui/AsyncState';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
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
import { authClient } from '../auth/client';
import { CommandForm } from '../components/CommandForm';
import { Action, Choice } from '../organization/Controls';
export function PricingPanel({
  business,
  productId,
  locations,
  focusField,
}: {
  business: Business;
  productId: string;
  locations: Location[];
  focusField?: string;
}) {
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
      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
      {state.busy && <LoadingState message="Loading pricing…" />}

      {quote && (
        <Text accessibilityLiveRegion="polite">
          Server price: {formatMinorUnits(quote.totalMinor, quote.currency)}; tax{' '}
          {formatMinorUnits(quote.taxMinor, quote.currency)}. This quote is not a completed sale.
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
            <Text>
              No selling price has been published. Use Publish price below before checkout.
            </Text>
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
                  inline={!!focusField}
                  key={`${form.title}-${id}`}
                  definition={form}
                  run={(work) => {
                    setQuote(null);
                    void model.run(work);
                  }}
                />
              ))}
          {state.data.prices.map((p) => (
            <Text key={p.id}>
              {p.unitPrice} {p.currency} ·{' '}
              {p.storeId ? locations.find((l) => l.id === p.storeId)?.name : 'Business price'} ·
              from {businessTime(p.startsAt, business.timeZone)}
            </Text>
          ))}

          <FormSection title="Variants and promotions" defaultOpen={!!focusField}>
            {state.data.variants.map((v) => (
              <Text key={v.id}>
                {v.name} · {v.sku} ·{' '}
                {Object.entries(v.attributes)
                  .map(([k, value]) => `${k}: ${value}`)
                  .join(', ')}
                {v.cost !== null && ` · cost ${v.cost} ${v.costCurrency}`}
              </Text>
            ))}
            {state.data.promotions.map((p) => (
              <Text key={p.id}>
                {p.name} · {p.discountBasisPoints / 100}% · priority {p.priority}
              </Text>
            ))}
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
                <Action
                  label={editing ? 'Add new variant' : 'Edit selected variant'}
                  onPress={() => setEditing(!editing)}
                />
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
              priceForms(client, state.data, business, locations, id, defaults)
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
          </FormSection>
        </>
      )}
    </ScreenBody>
  );
}
