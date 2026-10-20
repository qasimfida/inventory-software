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
import { Text, View } from 'react-native';
import { Action, Choice, Field } from '../organization/Controls';
import { CommandForm } from '../components/CommandForm';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
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
    <View>
      <Text accessibilityRole="header">Point of sale</Text>
      <Text>
        Online cash and authorized credit only. Cash amounts use currency minor units. Calculate,
        review, then confirm cash actually received. After reload or session lock, inspect sale
        history before retrying an uncertain sale.
      </Text>
      <ProductPicker
        client={client}
        warehouseId={warehouse.id}
        add={(item) => model.add(item)}
        disabled={locked}
      />
      {hasPermission(business, 'customers.read') && (
        <>
          <Field
            label="Find checkout customer"
            value={customerSearch}
            onChange={(value) => {
              setCustomerSearch(value);
              model.customer(null);
            }}
            disabled={locked}
          />
          <Choice
            label="Checkout customer"
            value={state.customerId ?? ''}
            options={[
              { value: '', label: 'Walk-in customer' },
              ...(customerState.data?.customers
                .filter((c) => c.state === 'active')
                .map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` })) ?? []),
            ]}
            onChange={(id) => model.customer(id || null)}
            disabled={locked}
          />
        </>
      )}
      <CartLines
        model={model}
        state={state}
        canDiscount={hasPermission(business, 'products.write')}
      />
      {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      <Action
        label="Calculate checkout total"
        disabled={locked || !state.lines.length}
        onPress={() => void model.preview()}
      />
      {state.quote && (
        <>
          <Text>
            Net {formatMinorUnits(state.quote.netMinor, state.quote.currency)} · tax{' '}
            {formatMinorUnits(state.quote.taxMinor, state.quote.currency)} · total{' '}
            {formatMinorUnits(state.quote.totalMinor, state.quote.currency)}
          </Text>
          {state.quote.lines.map((l, i) => (
            <Text key={i}>
              {l.sku} · base quantity {l.baseQuantity} · available {l.available} ·{' '}
              {formatMinorUnits(l.totalMinor, l.currency)}
            </Text>
          ))}
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
        <Text accessibilityLiveRegion="polite">
          Sale completed: {state.receipt.sale.id} · total{' '}
          {formatMinorUnits(state.receipt.sale.totalMinor, state.receipt.sale.currency)} · change{' '}
          {formatMinorUnits(state.receipt.sale.changeMinor, state.receipt.sale.currency)}
        </Text>
      )}
    </View>
  );
}
