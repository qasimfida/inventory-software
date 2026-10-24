import { FilterButton } from '../ui/FilterButton';
import { SidePanel } from '../ui/SidePanel';
import { View } from 'react-native';
import { RecordCollection } from '../ui/RecordCollection';
import { usePageCollection } from '../ui/usePageCollection';
import { Pagination } from '../ui/Pagination';
import { SearchControl } from '../ui/SearchControl';
import { IconAction } from '../ui/IconAction';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { CustomerStatement } from './CustomerStatement';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createCustomerClient,
  createPricingClient,
  cancellableResource,
  customerProfileForm,
  customerDetailForms,
  customerRetentionForms,
} from '@inventory/api-client';
import { hasPermission, businessTime, currencySchema } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { Choice } from '../organization/Controls';
import { CommandForm } from '../components/CommandForm';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
export function CustomerPanel({
  business,
  locations,
  initialSearch,
}: {
  business: Business;
  locations: Location[];
  initialSearch?: string | undefined;
}) {
  const stores = locations.filter((l) => l.kind === 'stores' && l.state === 'active');
  const [status, setStatus] = useState(''),
    [currency, setCurrency] = useState('');
  const [storeId, setStoreId] = useState(stores[0]?.id ?? ''),
    [search, setSearch] = useState(initialSearch ?? ''),
    [offset, setOffset] = useState(0),
    [customerId, setCustomerId] = useState(''),
    [statementOffset, setStatementOffset] = useState(0);
  const [previousSearch, setPreviousSearch] = useState(initialSearch);
  if (previousSearch !== initialSearch) {
    setPreviousSearch(initialSearch);

    if (initialSearch !== undefined) {
      setSearch(initialSearch);
      setOffset(0);
    }
  }
  const client = useMemo(
      () => createCustomerClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    ),
    pricing = useMemo(
      () => createPricingClient(authClient.organizationRequest, business.id, ''),
      [business.id],
    );
  const request = useMemo(
    () =>
      cancellableResource(
        async (signal) => ({
          page: await client.load(
            {
              storeId,
              search,
              offset,
              ...(status ? { state: status as 'active' | 'inactive' | 'archived' } : {}),
              ...(currency ? { currency: currencySchema.parse(currency) } : {}),
            },
            signal,
          ),
          retention: hasPermission(business, 'business.write') ? await client.retention() : null,
          prices:
            customerId && hasPermission(business, 'products.read')
              ? await client.prices(customerId)
              : null,
          statement: customerId ? await client.statement(customerId, statementOffset) : null,
        }),
        () => new AbortController(),
      ),
    [client, business, storeId, search, offset, customerId, statementOffset, status, currency],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, storeId, search, customerId, status, currency],
    [offset, statementOffset],
    [
      'page.customers',
      'statement.sales',
      'statement.payments',
      'statement.refunds',
      'statement.credits',
    ],
    () => {
      setOffset(0);
      setStatementOffset(0);
    },
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (storeId) void model.run();
    }, 250);
    return () => {
      clearTimeout(timer);
      request.cancel();
    };
  }, [model, request, storeId]);
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const toolbar = (
    <>
      <View style={{ flexGrow: 1, flexBasis: 160 }}>
        <SearchControl
          suggestions={
            state.data?.page.customers.map((item) => ({
              value: item.name,
              label: `${item.name} · ${item.code}`,
            })) ?? []
          }
          busy={state.busy || (!state.data && !state.error)}
          label="Search customers / email / phone"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setCustomerId('');
            setOffset(0);
          }}
        />
      </View>
      <FilterButton
        active={[
          status && `Status: ${status}`,
          currency && `Currency: ${currency}`,
          storeId && `Store: ${stores.find((s) => s.id === storeId)?.name ?? storeId}`,
        ].filter((value): value is string => Boolean(value))}
        onPress={() => setFiltersOpen(true)}
      />
      <SidePanel title="Customer filters" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
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
        <Choice
          label="Customer status filter"
          value={status}
          options={[
            { value: '', label: 'All statuses' },
            ...['active', 'inactive', 'archived'].map((value) => ({ value, label: value })),
          ]}
          onChange={(v) => {
            setStatus(v);
            setOffset(0);
            setCustomerId('');
          }}
        />
        <Choice
          label="Customer currency filter"
          value={currency}
          options={[
            { value: '', label: 'All currencies' },
            ...currencySchema.options.map((value) => ({ value, label: value })),
          ]}
          onChange={(v) => {
            setCurrency(v);
            setOffset(0);
            setCustomerId('');
          }}
        />
      </SidePanel>
      <IconAction
        label="Refresh customers"
        onPress={() => void model.run()}
        disabled={state.busy || !storeId}
        icon="↻"
      />
    </>
  );
  return (
    <ScreenBody>
      <ScreenHeader
        title="Customers and credit"
        description={
          <>
            Duplicate email or phone in this store is rejected. Statements are scoped to your
            access. Cash overpayments are rejected; credit overrides require explicit authority.
          </>
        }
      />
      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}

      {!state.data && <View>{toolbar}</View>}
      {state.data && (
        <>
          <RecordCollection
            toolbar={toolbar}
            items={state.data.page.customers.map((c) => ({
              id: c.id,
              title: c.name,
              subtitle: c.code,
              detail: `${c.email || c.phone || 'No contact'} · ${c.currency}`,
              status: c.state,
              tone:
                c.state === 'active'
                  ? ('success' as const)
                  : c.state === 'inactive'
                    ? ('warning' as const)
                    : ('neutral' as const),
            }))}
            label="customers"
            onOpen={(id) => {
              setCustomerId(id);
              setStatementOffset(0);
            }}
          />
          <Pagination
            label="customers"
            offset={offset}
            hasMore={state.data.page.hasMore}
            busy={state.busy || (!state.data && !state.error)}
            onChange={setOffset}
          />
          {state.data.statement && (
            <CustomerStatement
              busy={state.busy || Boolean(state.error)}
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
    </ScreenBody>
  );
}
