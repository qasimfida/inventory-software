import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { FilterButton } from '@/components/common/FilterButton';
import { RecordCollection } from '@/components/common/RecordCollection';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { Grid } from '@/components/common/Layout';
import { ScreenHeader } from '@/components/common/ScreenHeader';
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
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
import { authClient } from '@/platform/auth-client';
const operationKey = () => crypto.randomUUID();
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
  const toolbar = (
    <>
      <div className="collection-search">
        <SearchControl
          label="Search customers / email / phone"
          suggestions={
            state.data?.page.customers.map((item) => ({
              value: item.name,
              label: `${item.name} · ${item.code}`,
            })) ?? []
          }
          busy={state.busy || (!state.data && !state.error)}
          emptyMessage="No matching records. Try another name or code."
          value={search}
          onChange={(value) => {
            setSearch(value);
            setCustomerId('');
            setOffset(0);
          }}
        />
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <FilterButton
            aria-label="Customer filters"
            active={[
              status && `Status: ${status}`,
              currency && `Currency: ${currency}`,
              storeId && `Store: ${stores.find((s) => s.id === storeId)?.name ?? storeId}`,
            ].filter((value): value is string => Boolean(value))}
          />
        </PopoverTrigger>
        <PopoverContent align="end" className="space-y-3">
          {' '}
          <Grid className="screen-filters">
            <div>
              <label htmlFor="customer-store">Customer store</label>
              <Select
                id="customer-store"
                value={storeId}
                onChange={(e) => {
                  setStoreId(e.target.value);
                  setCustomerId('');
                  setOffset(0);
                }}
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          </Grid>
          <div className="inventory-controls">
            <label>
              Status
              <Select
                aria-label="Customer status filter"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setOffset(0);
                  setCustomerId('');
                }}
              >
                <option value="">All statuses</option>
                {['active', 'inactive', 'archived'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </label>
            <label>
              Currency
              <Select
                aria-label="Customer currency filter"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  setOffset(0);
                  setCustomerId('');
                }}
              >
                <option value="">All currencies</option>
                {currencySchema.options.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </Select>
            </label>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        onClick={() => void model.run()}
        disabled={state.busy || !storeId}
        variant="ghost"
        size="icon"
        aria-label="Refresh customers"
        title="Refresh"
      >
        <RefreshCw aria-hidden="true" />
      </Button>
    </>
  );
  return (
    <section aria-label="Customers and credit" className="screen-section">
      <ScreenHeader
        title="Customers and credit"
        description={
          <>
            Duplicate email or phone in this store is rejected. Statements are scoped to your
            access. Cash overpayments are rejected; credit overrides require explicit authority.
          </>
        }
      />
      {state.error && <p role="alert">{state.error}</p>}

      {!state.data && <div className="collection-toolbar">{toolbar}</div>}
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
            <p key={p.id}>
              Customer price (latest 100 periods) · {p.variantId} · {p.currency} {p.unitPrice} per
              base unit · from {businessTime(p.startsAt, business.timeZone)}
            </p>
          ))}
          {forms.map((f) => (
            <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </section>
  );
}
