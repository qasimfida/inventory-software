import { EmptyState } from '@/components/common/AsyncState';
import { canonicalJson } from '@inventory/domain';
import { OfflineProductOptions } from './OfflineProductOptions';
import { useEffect, useState } from 'react';
import type { OfflineWorkspace, VaultState } from '@inventory/api-client';
import { formatMinorUnits, formatDecimalPrice } from '@inventory/domain';
import { Package, ShoppingCart, Trash2 } from 'lucide-react';
import { SearchControl } from '@/components/common/SearchControl';
import { QuantityControl } from '@/components/common/QuantityControl';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCartHeight } from '../pos/useCartHeight';
export function OfflineCart({ model, data }: { model: OfflineWorkspace; data: VaultState }) {
  const [now, setNow] = useState(Date.now),
    [search, setSearch] = useState(''),
    [cash, setCash] = useState(''),
    [options, setOptions] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const lease = data.leases[data.activeLeaseId]!,
    valid = now < Date.parse(lease.expiresAt) && now >= data.lastSeen - 1000;
  const items = valid ? lease.snapshot.items : [],
    matches = items.filter((i) =>
      [i.name, i.sku, ...i.barcodes].some((v) => v.toLowerCase().includes(search.toLowerCase())),
    );
  const cart = useCartHeight(),
    total = model.total(),
    price = (amount: string) => formatDecimalPrice(amount, lease.currency);
  const add = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.units[0]) void model.add(id, item.units[0].id, '1', 0);
  };
  if (!valid)
    return (
      <p role="alert">
        Cached permission expired. Reconnect with the original account to renew. Pending sales
        remain saved and the cart is locked.
      </p>
    );
  return (
    <div className="pos-workspace">
      <div className="pos-products space-y-4">
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
          <p>
            New server data is available. Granted prices remain in use until pending sales are
            resolved and permission is renewed.
          </p>
        )}
        <SearchControl
          label="Search cached products or barcode"
          value={search}
          onChange={setSearch}
          suggestions={matches
            .slice(0, 20)
            .map((i) => ({ value: i.id, label: `${i.name} · ${i.sku} · ${price(i.unitPrice)}` }))}
          onSelect={add}
        />
        {!matches.length && (
          <EmptyState
            message="No matching cached products"
            description="Try another search. Reconnect to refresh the authorized catalog."
            announce
          />
        )}
        <ul className="product-grid">
          {matches.map((item) => (
            <li key={item.id} className="product-card">
              <div className="product-art" aria-hidden="true">
                <Package />
                <span>{item.sku}</span>
              </div>
              <h3>
                <Button variant="link" onClick={() => setOptions(item.id)}>
                  {item.name}
                </Button>
              </h3>
              <span>{item.available} cached stock</span>
              <Button
                variant="outline"
                onClick={() => add(item.id)}
                aria-label={`Add ${item.name}`}
              >
                <ShoppingCart />
                {price(item.unitPrice)}
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <aside ref={cart} className="pos-cart" aria-label="Cached cart details">
        <div className="pos-cart-scroll space-y-3">
          <h3>Cart details</h3>
          <StatusBadge tone="warning">Saved on this device · pending synchronization</StatusBadge>
          {data.cart.map((line, index) => {
            const item = items.find((i) => i.id === line.variantId);
            return (
              <div key={index} className="cart-line cart-line-compact">
                <div>
                  <strong>{item?.name}</strong>
                  <p>
                    {item?.sku} · {item?.units.find((u) => u.id === line.unitId)?.code}
                  </p>
                </div>
                <div className="cart-line-controls">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove cached line ${index + 1}`}
                    onClick={() => void model.editCart(index, null)}
                  >
                    <Trash2 />
                  </Button>
                  <QuantityControl
                    label={`Cached quantity ${index + 1}`}
                    id={`cached-qty-${index}`}
                    value={line.quantity}
                    onChange={(v) => void model.editCart(index, v)}
                  />
                </div>
              </div>
            );
          })}
          {!data.cart.length && <p>Your cart is empty. Choose a product to start a sale.</p>}
          <p role="status">
            Total: {/^[0-9]+$/.test(total) ? formatMinorUnits(total, lease.currency) : total || '—'}
          </p>
          <label htmlFor="cached-cash">Cash received ({lease.currency} minor units)</label>
          <Input
            id="cached-cash"
            inputMode="numeric"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
          />
          <p>
            Confirm cash actually received. Checkout is saved locally until the server accepts it;
            conflicts require review.
          </p>
          <Button variant="ghost" onClick={() => void model.clear()} disabled={!data.cart.length}>
            Clear draft
          </Button>
        </div>
        <div className="pos-checkout-footer">
          <Button
            disabled={!data.cart.length || !cash || !/^[0-9]+$/.test(total)}
            onClick={() => void model.checkout(cash)}
          >
            Checkout · save pending cash sale
          </Button>
        </div>
      </aside>
    </div>
  );
}
