import { ExportRecords } from '@/components/common/ExportRecords';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { IconButton } from '@/components/common/IconButton';
import { CustomerProfile } from './CustomerProfile';
import { CustomerEvidence } from './CustomerEvidence';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { FormSheet } from '@/components/common/FormSheet';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { FilterButton } from '@/components/common/FilterButton';
import { RecordCollection } from '@/components/common/RecordCollection';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { CustomerStatement } from './CustomerStatement';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createCustomerClient,
  createPricingClient,
  cancellableResource,
  customerProfileForm,
  customerDetailForms,
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
          <div className="space-y-1">
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
          </div>
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
      {(status || currency || search) && (
        <Button
          variant="ghost"
          onClick={() => {
            setStatus('');
            setCurrency('');
            setSearch('');
            setCustomerId('');
            setOffset(0);
            setStatementOffset(0);
          }}
        >
          Clear filters
        </Button>
      )}
      <IconButton
        icon={RefreshCw}
        label="Refresh customers"
        onClick={() => void model.run()}
        disabled={state.busy || !storeId}
      />
    </>
  );
  return (
    <section aria-label="Customers and credit" className="screen-section">
      <ScreenHeader
        title="Customers"
        actions={
          <>
            <ExportRecords
              name="customers"
              headers={['Name', 'Code', 'Contact', 'Currency', 'Status']}
              rows={(state.data?.page.customers ?? []).map((c) => [
                c.name,
                c.code,
                c.email || c.phone || '',
                c.currency,
                c.state,
              ])}
            />
            {storeId && hasPermission(business, 'customers.write') && (
              <CommandForm
                primary
                definition={{ ...customerProfileForm(client, storeId), title: 'Add customer' }}
                run={(work) => void model.run(work)}
              />
            )}
          </>
        }
        description={
          <>
            Manage customer profiles, review credit and track recorded payments for the selected
            store.
          </>
        }
      />
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}

      {!storeId && (
        <EmptyState
          message="No active store available"
          description="Customer records require an active store within your access."
        />
      )}
      {storeId && !state.data && !state.error && <LoadingState message="Loading customers…" />}
      {!state.data && <div className="collection-toolbar">{toolbar}</div>}
      {state.data && (
        <>
          <RecordCollection
            showExport={false}
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
          <FormSheet
            title="Customer details"
            description="Review the customer profile, credit policy and recorded transactions."
            open={!!customerId}
            onOpenChange={(open) => {
              if (!open) setCustomerId('');
            }}
          >
            <div className="min-w-0 shrink-0 space-y-3">
              {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
              {customer && (
                <CustomerProfile
                  customer={customer}
                  store={stores.find((s) => s.id === customer.storeId)?.name ?? customer.storeId}
                />
              )}
              {state.data.statement && (
                <CustomerStatement
                  busy={state.busy || Boolean(state.error)}
                  statement={state.data.statement}
                  business={business}
                  statementOffset={statementOffset}
                  setStatementOffset={setStatementOffset}
                />
              )}
              {state.data.prices && (
                <CustomerEvidence
                  title="Customer prices · latest 100 periods"
                  columns={['Variant reference', 'Price per base unit', 'Effective from']}
                  rows={state.data.prices.prices.map((p) => ({
                    id: p.id,
                    cells: [
                      p.variantId,
                      `${p.currency} ${p.unitPrice}`,
                      businessTime(p.startsAt, business.timeZone),
                    ],
                  }))}
                />
              )}
              {customer &&
                !customer.anonymized &&
                customer.state !== 'archived' &&
                hasPermission(business, 'customers.write') && (
                  <ConfirmDialog
                    title="Archive customer?"
                    trigger={
                      <Button variant="destructive" disabled={state.busy}>
                        Archive customer
                      </Button>
                    }
                    description="Remove this customer from active use. Their transaction history is retained. Customers with an outstanding balance cannot be archived."
                    confirmLabel="Archive customer"
                    onConfirm={() => {
                      if (!customer || state.busy) return;
                      void model.run(async () => {
                        await client.save(
                          {
                            code: customer.code,
                            name: customer.name,
                            email: customer.email,
                            phone: customer.phone,
                            address: customer.address,
                            notes: customer.notes,
                            currency: customer.currency,
                            state: 'archived',
                            storeId: customer.storeId,
                          },
                          customer.id,
                          customer.version,
                        );
                        setCustomerId('');
                      });
                    }}
                  />
                )}
              {forms.map((f) => (
                <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
              ))}
            </div>
          </FormSheet>
        </>
      )}
    </section>
  );
}
