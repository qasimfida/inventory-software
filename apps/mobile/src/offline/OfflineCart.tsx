import { EmptyState } from '../ui/AsyncState';
import { canonicalJson } from '@inventory/domain';
import { useCartDock } from '../pos/CartDock';
import { SidePanel } from '../ui/SidePanel';
import { OfflineProductOptions } from './OfflineProductOptions';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { OfflineWorkspace, VaultState } from '@inventory/api-client';
import { formatMinorUnits, formatDecimalPrice } from '@inventory/domain';
import { SearchControl } from '../ui/SearchControl';
import { QuantityControl } from '../ui/QuantityControl';
import { Text } from '../ui/Themed';
import { Action, Field } from '../ui/Controls';
import { IconAction } from '../ui/IconAction';
import { BarcodeScanner } from '../catalog/BarcodeScanner';
import { useTheme } from '../theme';
export function OfflineCart({ model, data }: { model: OfflineWorkspace; data: VaultState }) {
  const theme = useTheme(),
    [now, setNow] = useState(Date.now),
    [search, setSearch] = useState(''),
    [cash, setCash] = useState(''),
    [options, setOptions] = useState(''),
    [cartOpen, setCartOpen] = useState(false);
  const dock = useCartDock(),
    setDock = dock.setCart;
  useEffect(() => {
    setDock({
      label: `View cached cart · ${data.cart.length} items`,
      open: () => setCartOpen(true),
    });
    return () => setDock(null);
  }, [setDock, data.cart.length]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const lease = data.leases[data.activeLeaseId]!,
    valid = now < Date.parse(lease.expiresAt) && now >= data.lastSeen - 1000;
  const items = valid ? lease.snapshot.items : [],
    matches = items.filter((i) =>
      [i.name, i.sku, ...i.barcodes].some((v) => v.toLowerCase().includes(search.toLowerCase())),
    ),
    total = model.total();
  const price = (amount: string) => formatDecimalPrice(amount, lease.currency);
  const add = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.units[0]) void model.add(id, item.units[0].id, '1', 0);
  };
  if (!valid)
    return (
      <Text accessibilityRole="alert">
        Cached permission expired. Reconnect with the original account to renew. Pending sales
        remain saved and the cart is locked.
      </Text>
    );
  const cart = (
    <>
      <Text accessibilityRole="header">Cart details</Text>
      <Text tone="muted">Saved on this device · pending synchronization</Text>
      {data.cart.map((line, index) => {
        const item = items.find((i) => i.id === line.variantId);
        return (
          <View
            key={index}
            style={{
              padding: theme.spacing.small,
              borderRadius: theme.radius,
              backgroundColor: theme.tokens.muted,
            }}
          >
            <Text>
              {item?.name} · {item?.units.find((u) => u.id === line.unitId)?.code}
            </Text>
            <QuantityControl
              label={`Cached quantity ${index + 1}`}
              value={line.quantity}
              onChange={(v) => void model.editCart(index, v)}
            />
            <IconAction
              icon="×"
              label={`Remove cached line ${index + 1}`}
              onPress={() => void model.editCart(index, null)}
            />
          </View>
        );
      })}
      <Text accessibilityLiveRegion="polite">
        Total: {/^[0-9]+$/.test(total) ? formatMinorUnits(total, lease.currency) : total || '—'}
      </Text>
      <Field
        label={`Cash received (${lease.currency} minor units)`}
        value={cash}
        onChange={setCash}
      />
      <Text>
        Confirm cash actually received. Checkout is saved locally until the server accepts it;
        conflicts require review.
      </Text>
    </>
  );
  const checkout = (
    <Action
      disabled={!data.cart.length || !cash || !/^[0-9]+$/.test(total)}
      label="Checkout · save pending cash sale"
      onPress={() => void model.checkout(cash)}
    />
  );
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <SearchControl
        label="Search cached products or barcode"
        value={search}
        onChange={setSearch}
        suggestions={matches
          .slice(0, 20)
          .map((i) => ({ value: i.id, label: `${i.name} · ${i.sku} · ${price(i.unitPrice)}` }))}
        onSelect={add}
      />
      <BarcodeScanner onCode={setSearch} />
      {!matches.length && (
        <EmptyState
          message="No matching cached products"
          description="Try another search. Reconnect to refresh the authorized catalog."
        />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
        {matches.map((item) => (
          <View
            key={item.id}
            style={{
              width: '47%',
              flexGrow: 1,
              padding: theme.spacing.small,
              borderRadius: theme.radius,
              backgroundColor: theme.tokens.card,
            }}
          >
            <Action variant="ghost" label={item.name} onPress={() => setOptions(item.id)} />
            <Text tone="muted">
              {item.sku} · {item.available} cached stock
            </Text>
            <Action
              variant="outline"
              icon="cart"
              label={price(item.unitPrice)}
              onPress={() => add(item.id)}
            />
          </View>
        ))}
      </View>
      {options && (
        <OfflineProductOptions
          key={options}
          model={model}
          data={data}
          variantId={options}
          close={() => setOptions('')}
        />
      )}
      {canonicalJson(data.cache.items) !== canonicalJson(lease.snapshot.items) && (
        <Text>
          New server data is available. Granted prices remain in use until pending sales are
          resolved and permission is renewed.
        </Text>
      )}
      {dock.available ? (
        <>
          <Action label="View cached cart" onPress={() => setCartOpen(true)} />
          <SidePanel
            title="Cached cart"
            open={cartOpen}
            onClose={() => setCartOpen(false)}
            footer={checkout}
          >
            {cart}
          </SidePanel>
        </>
      ) : (
        <>
          {cart}
          {checkout}
        </>
      )}
      <Action variant="ghost" label="Clear draft" onPress={() => void model.clear()} />
    </View>
  );
}
