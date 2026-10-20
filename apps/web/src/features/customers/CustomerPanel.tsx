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
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { authClient } from '@/platform/auth-client';
const operationKey = () => crypto.randomUUID();
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
    <section aria-label="Customers and credit" className="space-y-3 border-t pt-4">
      <h2>Customers and credit</h2>
      <p>
        Duplicate email or phone in this store is rejected. Statements are scoped to your access.
        Cash overpayments are rejected; credit overrides require explicit authority.
      </p>
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
      <label htmlFor="customer-search">Search customers / email / phone</label>
      <Input
        id="customer-search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCustomerId('');
          setOffset(0);
        }}
      />
      {state.error && <p role="alert">{state.error}</p>}
      <Button onClick={() => void model.run()} disabled={state.busy || !storeId}>
        Refresh customers
      </Button>
      {state.data && (
        <>
          <label htmlFor="customer-record">Customer record</label>
          <Select
            id="customer-record"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setStatementOffset(0);
            }}
          >
            <option value="">Select customer</option>
            {state.data.page.customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </Select>
          <Button onClick={() => setOffset(Math.max(0, offset - 25))} disabled={!offset}>
            Previous customers
          </Button>
          <Button onClick={() => setOffset(offset + 25)} disabled={!state.data.page.hasMore}>
            Next customers
          </Button>
          {state.data.statement && (
            <CustomerStatement
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
