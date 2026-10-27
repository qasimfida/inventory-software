import { HeldCarts } from './HeldCarts';
import { useState } from 'react';
import { CreateCustomerSheet } from '../customers/CreateCustomerSheet';
import type { createCustomerClient } from '@inventory/api-client';
import { SearchControl } from '../ui/SearchControl';
import { IconAction } from '../ui/IconAction';
import { metrics } from '../ui/metrics';
import { RecordDetails } from '../ui/RecordDetails';
import { Surface } from '../ui/Surface';
import { Text } from '../ui/Themed';
import { Action, Choice } from '../organization/Controls';
import { PaymentReview } from './PaymentReview';
import { CartLines } from './CartLines';
import type { PosModel, PosState } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Customer } from '@inventory/contracts';
import { formatMinorUnits } from '@inventory/domain';
export function PosCart({
  hideCheckout = false,
  business,
  model,
  state,
  customerSearch,
  setCustomerSearch,
  customers,
  customerClient,
  storeId,
  onCustomerCreated,
  customerBusy,
  reviewedQuote,
  setReviewedQuote,
}: {
  hideCheckout?: boolean;
  business: Business;
  model: PosModel;
  state: PosState;
  customerSearch: string;
  setCustomerSearch: (value: string) => void;
  customers: Customer[];
  customerClient: ReturnType<typeof createCustomerClient>;
  storeId: string;
  onCustomerCreated: (id: string, name: string) => void;
  customerBusy: boolean;
  reviewedQuote: string;
  setReviewedQuote: (value: string) => void;
}) {
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const locked = state.busy || state.uncertain;
  return (
    <Surface>
      <Text accessibilityRole="header" style={{ fontSize: metrics.heading }}>
        Cart details
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        tone={state.uncertain ? 'warning' : state.busy ? 'info' : 'default'}
      >
        {state.uncertain
          ? 'Outcome unknown — inspect history or retry the same checkout'
          : state.busy
            ? 'Processing checkout'
            : state.quote
              ? 'Review quoted totals before payment'
              : 'Cart draft'}
      </Text>
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
              const c = customers.find((c) => c.id === id);
              if (c) {
                setCustomerSearch(c.name);
                model.customer(id);
              }
            }}
            value={customerSearch}
            onChange={(value) => {
              setCustomerSearch(value);
              model.customer(null);
            }}
            disabled={locked}
            busy={customerBusy}
            suggestions={
              customers.map((c) => ({
                value: c.id,
                label: `${c.name} · ${c.code}`,
              })) ?? []
            }
          />
          <Choice
            label="Checkout customer"
            value={state.customerId ?? ''}
            options={[
              { value: '', label: 'Walk-in customer' },
              ...(customers
                .filter((c) => c.state === 'active')
                .map((c) => ({ value: c.id, label: `${c.code} · ${c.name}` })) ?? []),
            ]}
            onChange={(id) => model.customer(id || null)}
            disabled={locked}
          />
        </>
      )}
      <CreateCustomerSheet
        client={customerClient}
        storeId={storeId}
        name={customerSearch}
        open={creatingCustomer}
        onClose={() => setCreatingCustomer(false)}
        onCreated={onCustomerCreated}
      />
      <HeldCarts model={model} state={state} />
      <CartLines
        model={model}
        state={state}
        canDiscount={hasPermission(business, 'products.write')}
      />
      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
      {Boolean(state.error) && !state.uncertain && !state.quote && (
        <IconAction
          label="Retry price quote"
          icon="↻"
          disabled={locked}
          onPress={() => void model.preview()}
        />
      )}
      {!hideCheckout && (
        <Action
          label="Checkout"
          disabled={locked || !state.quote}
          onPress={() =>
            state.quote ? setReviewedQuote(state.quote.quoteFingerprint) : void model.preview()
          }
        />
      )}
      {state.quote && (
        <>
          <RecordDetails
            label="Checkout totals"
            items={[
              {
                label: 'Net after discounts',
                value: formatMinorUnits(state.quote.netMinor, state.quote.currency),
              },
              {
                label: 'Tax',
                value: formatMinorUnits(state.quote.taxMinor, state.quote.currency),
              },
              {
                label: 'Total payment',
                value: formatMinorUnits(state.quote.totalMinor, state.quote.currency),
              },
            ]}
          />
          {state.quote.lines.map((l, i) => (
            <Text key={i}>
              {l.sku} · base quantity {l.baseQuantity} · available {l.available} ·{' '}
              {formatMinorUnits(l.totalMinor, l.currency)}
            </Text>
          ))}
        </>
      )}
      {((state.quote && reviewedQuote === state.quote.quoteFingerprint) || state.uncertain) &&
        !state.busy && (
          <PaymentReview
            key={state.quote?.quoteFingerprint ?? 'uncertain'}
            model={model}
            state={state}
            canOverride={hasPermission(business, 'customers.override')}
          />
        )}
      {state.receipt && (
        <Text accessibilityLiveRegion="polite">
          Sale completed: {state.receipt.sale.id} · total{' '}
          {formatMinorUnits(state.receipt.sale.totalMinor, state.receipt.sale.currency)} · change{' '}
          {formatMinorUnits(state.receipt.sale.changeMinor, state.receipt.sale.currency)}
        </Text>
      )}
    </Surface>
  );
}
