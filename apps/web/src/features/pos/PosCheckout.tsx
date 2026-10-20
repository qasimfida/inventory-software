import { Invalidations, createSyncClient } from '@inventory/api-client';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createSalesClient,
  createCustomerClient,
  PosModel,
  ResourceModel,
  checkoutForm,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { formatMinorUnits } from '@inventory/domain';
import { ProductPicker } from './ProductPicker';
import { CartLines } from './CartLines';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { CommandForm } from '@/components/common/CommandForm';
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
  const [customerSearch, setCustomerSearch] = useState('');
  const customerModel = useMemo(
      () =>
        new ResourceModel(() =>
          customers.load({ storeId: warehouse.storeId!, search: customerSearch }),
        ),
      [customers, warehouse.storeId, customerSearch],
    ),
    customerState = useSyncExternalStore(
      customerModel.subscribe,
      customerModel.snapshot,
      customerModel.snapshot,
    );
  useEffect(() => {
    if (hasPermission(business, 'customers.read')) void customerModel.run();
    return customerModel.reset;
  }, [customerModel, business]);
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
    onLockChange(state.busy || state.uncertain || state.lines.length > 0);
  }, [onLockChange, state.busy, state.uncertain, state.lines.length]);
  const locked = state.busy || state.uncertain;
  return (
    <section aria-label="Point of sale" className="space-y-3">
      <h2>Point of sale</h2>
      <p>
        Online cash and authorized credit only. Cash amounts use currency minor units. Calculate,
        review, then confirm cash actually received. After reload or session lock, inspect sale
        history before retrying an uncertain sale.
      </p>
      <ProductPicker
        client={client}
        warehouseId={warehouse.id}
        add={(item) => model.add(item)}
        disabled={locked}
      />
      {hasPermission(business, 'customers.read') && (
        <>
          <label htmlFor="pos-customer-search">Find checkout customer</label>
          <Input
            id="pos-customer-search"
            value={customerSearch}
            onChange={(e) => {
              setCustomerSearch(e.target.value);
              model.customer(null);
            }}
            disabled={locked}
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
      <CartLines
        model={model}
        state={state}
        canDiscount={hasPermission(business, 'products.write')}
      />
      {state.error && <p role="alert">{state.error}</p>}
      <Button disabled={locked || !state.lines.length} onClick={() => void model.preview()}>
        Calculate checkout total
      </Button>
      {state.quote && (
        <>
          <p>
            Net {formatMinorUnits(state.quote.netMinor, state.quote.currency)} · tax{' '}
            {formatMinorUnits(state.quote.taxMinor, state.quote.currency)} · total{' '}
            {formatMinorUnits(state.quote.totalMinor, state.quote.currency)}
          </p>
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
      {(state.quote || state.uncertain) && !state.busy && (
        <CommandForm
          definition={checkoutForm(model, state, hasPermission(business, 'customers.override'))}
          run={(work) => {
            void work();
          }}
        />
      )}
      {state.receipt && (
        <p role="status">
          Sale completed: {state.receipt.sale.id} · total{' '}
          {formatMinorUnits(state.receipt.sale.totalMinor, state.receipt.sale.currency)} · change{' '}
          {formatMinorUnits(state.receipt.sale.changeMinor, state.receipt.sale.currency)}
        </p>
      )}
    </section>
  );
}
