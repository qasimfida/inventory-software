import { formatMinorUnits } from '@inventory/api-client';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
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
import { Action, Choice, styles } from '../organization/Controls';
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
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
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
    <View style={styles.group}>
      <Text accessibilityRole="header">Variants, units and pricing</Text>
      {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      {state.busy && <Text>Loading pricing…</Text>}
      <Action
        label="Refresh pricing"
        disabled={state.busy}
        onPress={() => {
          setQuote(null);
          void model.run();
        }}
      />
      {quote && (
        <Text accessibilityLiveRegion="polite">
          Server price: {formatMinorUnits(quote.totalMinor, quote.currency)}; tax{' '}
          {formatMinorUnits(quote.taxMinor, quote.currency)}. This quote is not a completed sale.
        </Text>
      )}
      {state.data && (
        <>
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
          {state.data.variants.map((v) => (
            <Text key={v.id}>
              {v.name} · {v.sku} ·{' '}
              {Object.entries(v.attributes)
                .map(([k, value]) => `${k}: ${value}`)
                .join(', ')}
              {v.cost !== null && ` · cost ${v.cost} ${v.costCurrency}`}
            </Text>
          ))}
          {state.data.prices.map((p) => (
            <Text key={p.id}>
              {p.unitPrice} {p.currency} ·{' '}
              {p.storeId ? locations.find((l) => l.id === p.storeId)?.name : 'Business price'} ·
              from {businessTime(p.startsAt, business.timeZone)}
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
    </View>
  );
}
