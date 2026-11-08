import { useTheme } from '../theme';
import { ManageProduct } from '../catalog/ManageProduct';
import { useCatalogLive } from '../platform/useCatalogLive';
import { PosCart } from './PosCart';
import { SidePanel } from '../ui/SidePanel';
import { useCartDock } from './CartDock';
import { Invalidations, createSyncClient } from '@inventory/api-client';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
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
import { View, useWindowDimensions } from 'react-native';
import { Action } from '../organization/Controls';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
export function PosCheckout({
  business,
  warehouse,
  locations = [warehouse],
  onLockChange,
  active = true,
}: {
  active?: boolean;
  business: Business;
  warehouse: Location;
  locations?: Location[];
  onLockChange: (locked: boolean) => void;
}) {
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const { width } = useWindowDimensions();
  const theme = useTheme();
  const dock = useCartDock(),
    [cartOpen, setCartOpen] = useState(false);
  const setDock = dock.setCart;
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
  const [reviewedQuote, setReviewedQuote] = useState('');
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
  // Retain drafts and recovery. Only an idle, hidden checkout stops polling.
  const shouldPoll =
    active || state.lines.length > 0 || state.heldCarts.length > 0 || state.busy || state.uncertain;
  useEffect(() => {
    if (!shouldPoll) return;
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
  }, [model, business.id, warehouse.id, shouldPoll]);
  useEffect(() => {
    onLockChange(
      state.busy || state.uncertain || state.lines.length > 0 || state.heldCarts.length > 0,
    );
  }, [onLockChange, state.busy, state.uncertain, state.lines.length, state.heldCarts.length]);
  useEffect(() => {
    setDock({
      label: `View cart · ${state.lines.length} items${state.quote ? ` · ${formatMinorUnits(state.quote.totalMinor, state.quote.currency)}` : ''}`,
      open: () => setCartOpen(true),
    });
    return () => setDock(null);
  }, [setDock, state.lines.length, state.quote]);
  const [priceRevision, setPriceRevision] = useState(0);
  useCatalogLive(business.id, () => {
    model.invalidate();
    setPriceRevision((old) => old + 1);
  });
  const locked = state.busy || state.uncertain;
  const cart = (
    <PosCart
      hideCheckout={dock.available}
      business={business}
      model={model}
      state={state}
      customerSearch={customerSearch}
      setCustomerSearch={setCustomerSearch}
      customers={customerState.data?.customers ?? []}
      customerClient={customers}
      storeId={warehouse.storeId!}
      onCustomerCreated={(id, name) => {
        setCustomerSearch(name);
        model.customer(id);
        void customerModel.run();
      }}
      customerBusy={customerState.busy || (!customerState.data && !customerState.error)}
      reviewedQuote={reviewedQuote}
      setReviewedQuote={setReviewedQuote}
    />
  );
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <View style={{ flexDirection: width >= 1000 ? 'row' : 'column', gap: theme.spacing.large }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {editingProduct && (
            <ManageProduct
              business={business}
              locations={locations}
              productId={editingProduct}
              onClose={() => {
                setEditingProduct(null);
                model.invalidate();
                setPriceRevision((old) => old + 1);
              }}
            />
          )}
          <ProductPicker
            revision={priceRevision}
            onManage={
              hasPermission(business, 'products.write') &&
              hasPermission(business, 'products.read') &&
              !business.scope?.storeId
                ? setEditingProduct
                : undefined
            }
            client={client}
            warehouseId={warehouse.id}
            add={(item) => model.add(item)}
            disabled={locked}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          {dock.available ? (
            <>
              <Action label="View cart" onPress={() => setCartOpen(true)} />
              <SidePanel
                title="Cart details"
                revealEndKey={state.quote?.quoteFingerprint === reviewedQuote ? reviewedQuote : ''}
                open={cartOpen}
                onClose={() => setCartOpen(false)}
                footer={
                  <Action
                    label="Checkout"
                    disabled={locked || !state.quote}
                    onPress={() =>
                      state.quote
                        ? setReviewedQuote(state.quote.quoteFingerprint)
                        : void model.preview()
                    }
                  />
                }
              >
                {cart}
              </SidePanel>
            </>
          ) : (
            cart
          )}
        </View>
      </View>
    </View>
  );
}
