import { HeldCarts } from './HeldCarts';
import { useCatalogLive } from '@/platform/useCatalogLive';
import { useCartHeight } from './useCartHeight';
import { CreateCustomerSheet } from '../customers/CreateCustomerSheet';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { MoneyValue } from '@/components/common/DataValue';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Invalidations, createSyncClient } from '@inventory/api-client';
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  createSalesClient,
  createCustomerClient,
  PosModel,
  observeCartQuotes,
  cancellableResource,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { formatMinorUnits } from '@inventory/domain';
import { ProductPicker } from './ProductPicker';
import { CartLines } from './CartLines';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
import { PaymentReview } from './PaymentReview';
import { authClient } from '@/platform/auth-client';
const operationKey = () => crypto.randomUUID();
export function PosCheckout({
  business,
  warehouse,
  onLockChange,
}: {
  business: Business;
  warehouse: Location;
  onLockChange: (locked: boolean) => void;
}) {
  const client = useMemo(
      () => createSalesClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    ),
    customers = useMemo(
      () => createCustomerClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    );
  const model = useMemo(() => new PosModel(client, warehouse.id), [client, warehouse.id]),
    state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [reviewedQuote, setReviewedQuote] = useState('');
  const checkoutReview = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reviewedQuote)
      checkoutReview.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, [reviewedQuote]);
  useEffect(
    () =>
      observeCartQuotes(model, (work) => {
        const timer = setTimeout(work, 300);
        return () => clearTimeout(timer);
      }),
    [model],
  );
  const customerRequest = useMemo(
    () =>
      cancellableResource(
        (signal) => customers.load({ storeId: warehouse.storeId!, search: customerSearch }, signal),
        () => new AbortController(),
      ),
    [customers, warehouse.storeId, customerSearch],
  );
  const customerModel = customerRequest.model;
  const customerState = useSyncExternalStore(
    customerModel.subscribe,
    customerModel.snapshot,
    customerModel.snapshot,
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasPermission(business, 'customers.read')) void customerModel.run();
    }, 250);
    return () => {
      clearTimeout(timer);
      customerRequest.cancel();
    };
  }, [customerModel, customerRequest, business]);
  useEffect(() => model.reset, [model]);
  useEffect(() => {
    const feed = new Invalidations(
      createSyncClient(authClient.organizationRequest, business.id),
      warehouse.id,
      'USD',
      () => model.invalidate(),
    );
    void feed.tick();
    const timer = setInterval(() => void feed.tick(), 3000);
    return () => {
      feed.stop();
      clearInterval(timer);
    };
  }, [model, business.id, warehouse.id]);
  useEffect(() => {
    onLockChange(
      state.busy || state.uncertain || state.lines.length > 0 || state.heldCarts.length > 0,
    );
  }, [onLockChange, state.busy, state.uncertain, state.lines.length, state.heldCarts.length]);
  const cartRef = useCartHeight();
  const [priceRevision, setPriceRevision] = useState(0);
  useCatalogLive(business.id, () => {
    model.invalidate();
    setPriceRevision((old) => old + 1);
  });
  const locked = state.busy || state.uncertain;
  return (
    <section aria-label="Point of sale" className="screen-section">
      <div className="pos-workspace">
        <ProductPicker
          revision={priceRevision}
          client={client}
          warehouseId={warehouse.id}
          add={(item) => model.add(item)}
          disabled={locked}
        />
        <aside ref={cartRef} className="pos-cart space-y-4" aria-label="Cart details">
          <div className="pos-cart-scroll">
            <HeldCarts model={model} state={state} />
            <div className="product-card-summary">
              <h3>Cart details</h3>{' '}
              <div role="status">
                <StatusBadge tone={state.uncertain ? 'warning' : state.busy ? 'info' : 'neutral'}>
                  {state.uncertain
                    ? 'Outcome unknown — inspect history or retry the same checkout'
                    : state.busy
                      ? 'Processing checkout'
                      : state.quote
                        ? 'Review quoted totals before payment'
                        : 'Cart draft'}
                </StatusBadge>
              </div>
            </div>
            {hasPermission(business, 'customers.read') && (
              <>
                <SearchControl
                  label="Find checkout customer"
                  action={
                    hasPermission(business, 'customers.write')
                      ? { label: '＋ Add customer', onSelect: () => setCreatingCustomer(true) }
                      : undefined
                  }
                  onSelect={(id) => {
                    const customer = customerState.data?.customers.find((c) => c.id === id);
                    if (customer) {
                      setCustomerSearch(customer.name);
                      model.customer(id);
                    }
                  }}
                  value={customerSearch}
                  onChange={(value) => {
                    setCustomerSearch(value);
                    model.customer(null);
                  }}
                  disabled={locked}
                  busy={customerState.busy || (!customerState.data && !customerState.error)}
                  suggestions={
                    customerState.data?.customers.map((c) => ({
                      value: c.id,
                      label: `${c.name} · ${c.code}`,
                    })) ?? []
                  }
                  emptyMessage="No matching customers. Try another name or code."
                />
                <label htmlFor="pos-customer">Checkout customer</label>
                <Select
                  id="pos-customer"
                  value={state.customerId ?? ''}
                  onChange={(e) => model.customer(e.target.value || null)}
                  disabled={locked}
                >
                  <option value="">Walk-in customer</option>
                  {customerState.data?.customers
                    .filter((c) => c.state === 'active')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} · {c.name}
                      </option>
                    ))}
                </Select>
              </>
            )}
            <CreateCustomerSheet
              client={customers}
              storeId={warehouse.storeId!}
              name={customerSearch}
              open={creatingCustomer}
              onClose={() => setCreatingCustomer(false)}
              onCreated={(id, name) => {
                setCustomerSearch(name);
                model.customer(id);
                void customerModel.run();
              }}
            />
            <CartLines
              model={model}
              state={state}
              canDiscount={hasPermission(business, 'products.write')}
            />
            {state.error && <p role="alert">{state.error}</p>}
            {state.error && !state.uncertain && !state.quote && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Retry price quote"
                disabled={locked}
                onClick={() => void model.preview()}
              >
                <RefreshCw />
              </Button>
            )}
            {state.quote && (
              <>
                <dl className="checkout-totals" aria-live="polite">
                  <div>
                    <dt>Net after discounts</dt>
                    <dd>{formatMinorUnits(state.quote.netMinor, state.quote.currency)}</dd>
                  </div>
                  <div>
                    <dt>Tax</dt>
                    <dd>{formatMinorUnits(state.quote.taxMinor, state.quote.currency)}</dd>
                  </div>
                  <div className="checkout-total">
                    <dt>Total payment</dt>
                    <dd>
                      <MoneyValue amount={state.quote.totalMinor} currency={state.quote.currency} />
                    </dd>
                  </div>
                </dl>
                <ul>
                  {state.quote.lines.map((l, i) => (
                    <li key={i}>
                      {l.sku} · base quantity {l.baseQuantity} · available {l.available} ·{' '}
                      {formatMinorUnits(l.totalMinor, l.currency)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {((state.quote && reviewedQuote === state.quote.quoteFingerprint) || state.uncertain) &&
              !state.busy && (
                <div ref={checkoutReview}>
                  <PaymentReview
                    key={state.quote?.quoteFingerprint ?? 'uncertain'}
                    model={model}
                    state={state}
                    canOverride={hasPermission(business, 'customers.override')}
                  />
                </div>
              )}
            {state.receipt && (
              <p role="status">
                Sale completed: {state.receipt.sale.id} · total{' '}
                {formatMinorUnits(state.receipt.sale.totalMinor, state.receipt.sale.currency)} ·
                change{' '}
                {formatMinorUnits(state.receipt.sale.changeMinor, state.receipt.sale.currency)}
              </p>
            )}
          </div>
          <div className="pos-checkout-footer">
            <Button
              disabled={locked || !state.quote}
              onClick={() =>
                state.quote ? setReviewedQuote(state.quote.quoteFingerprint) : void model.preview()
              }
            >
              Checkout
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
