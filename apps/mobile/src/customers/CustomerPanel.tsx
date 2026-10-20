import { CustomerStatement } from './CustomerStatement';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createCustomerClient,
  createPricingClient,
  ResourceModel,
  customerProfileForm,
  customerDetailForms,
  customerRetentionForms,
} from '@inventory/api-client';
import { hasPermission, businessTime } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { Text, View } from 'react-native';
import { Action, Choice, Field, styles } from '../organization/Controls';
import { CommandForm } from '../components/CommandForm';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
export function CustomerPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const stores = locations.filter((l) => l.kind === 'stores' && l.state === 'active');
  const [storeId, setStoreId] = useState(stores[0]?.id ?? ''),
    [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [customerId, setCustomerId] = useState(''),
    [statementOffset, setStatementOffset] = useState(0);
  const client = useMemo(
      () => createCustomerClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    ),
    pricing = useMemo(
      () => createPricingClient(authClient.organizationRequest, business.id, ''),
      [business.id],
    );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        page: await client.load({ storeId, search, offset }),
        retention: hasPermission(business, 'business.write') ? await client.retention() : null,
        prices:
          customerId && hasPermission(business, 'products.read')
            ? await client.prices(customerId)
            : null,
        statement: customerId ? await client.statement(customerId, statementOffset) : null,
      })),
    [client, business, storeId, search, offset, customerId, statementOffset],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    if (storeId) void model.run();
    return model.reset;
  }, [model, storeId]);
  const customer = state.data?.page.customers.find((c) => c.id === customerId);
  const forms = state.data
    ? [
        ...(state.data.retention ? customerRetentionForms(client, state.data.retention) : []),
        ...(hasPermission(business, 'customers.write')
          ? [customerProfileForm(client, storeId)]
          : []),
        ...(customer && state.data.statement
          ? customerDetailForms(client, pricing, customer, business, state.data.statement)
          : []),
      ]
    : [];
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header">Customers and credit</Text>
      <Text>
        Duplicate email or phone in this store is rejected. Statements are scoped to your access.
        Cash overpayments are rejected; credit overrides require explicit authority.
      </Text>
      <Choice
        label="Customer store"
        value={storeId}
        options={stores.map((s) => ({ value: s.id, label: s.name }))}
        onChange={(v) => {
          setStoreId(v);
          setCustomerId('');
          setOffset(0);
        }}
      />
      <Field
        label="Search customers / email / phone"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setCustomerId('');
          setOffset(0);
        }}
      />
      {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      <Action
        label="Refresh customers"
        onPress={() => void model.run()}
        disabled={state.busy || !storeId}
      />
      {state.data && (
        <>
          <Choice
            label="Customer record"
            value={customerId}
            options={[
              { value: '', label: 'Select customer' },
              ...state.data.page.customers.map((c) => ({
                value: c.id,
                label: `${c.code} · ${c.name}`,
              })),
            ]}
            onChange={(v) => {
              setCustomerId(v);
              setStatementOffset(0);
            }}
          />
          <Action
            label="Previous customers"
            onPress={() => setOffset(Math.max(0, offset - 25))}
            disabled={!offset}
          />
          <Action
            label="Next customers"
            onPress={() => setOffset(offset + 25)}
            disabled={!state.data.page.hasMore}
          />
          {state.data.statement && (
            <CustomerStatement
              statement={state.data.statement}
              business={business}
              statementOffset={statementOffset}
              setStatementOffset={setStatementOffset}
            />
          )}
          {state.data.prices?.prices.map((p) => (
            <Text key={p.id}>
              Customer price (latest 100 periods) · {p.variantId} · {p.currency} {p.unitPrice} per
              base unit · from {businessTime(p.startsAt, business.timeZone)}
            </Text>
          ))}
          {forms.map((f) => (
            <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </View>
  );
}
