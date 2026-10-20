import { BarcodeScanner } from '../catalog/BarcodeScanner';
import { canonicalJson } from '@inventory/domain';
import { useEffect, useState } from 'react';
import type { OfflineWorkspace, VaultState } from '@inventory/api-client';
import { Text as Txt } from 'react-native';
import { Field as F, Choice as Pick, Action as Act } from '../organization/Controls';
export function OfflineCart({ model, data }: { model: OfflineWorkspace; data: VaultState }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const lease = data.leases[data.activeLeaseId]!,
    valid = now < Date.parse(lease.expiresAt) && now >= data.lastSeen - 1000,
    items = valid ? lease.snapshot.items : [];
  const [variantId, setVariant] = useState(''),
    [unitId, setUnit] = useState(''),
    [quantity, setQuantity] = useState('1'),
    [discount, setDiscount] = useState('0'),
    [cash, setCash] = useState(''),
    [scan, setScan] = useState('');
  const item = items.find((i) => i.id === variantId);
  const find = () => {
    const found = items.filter((i) => i.sku === scan || i.barcodes.includes(scan));
    if (found.length === 1) {
      setVariant(found[0]!.id);
      setUnit(found[0]!.units[0]?.id ?? '');
    }
    setScan('');
  };
  return valid ? (
    <>
      {canonicalJson(data.cache.items) !== canonicalJson(lease.snapshot.items) && (
        <Txt>
          New server data is available. Existing permission prices remain in use until pending
          operations are resolved and permission is renewed.
        </Txt>
      )}
      <F label="Scan product barcode or SKU" value={scan} onChange={setScan} />
      <BarcodeScanner onCode={setScan} />
      <Act label="Find scanned product" onPress={find} />
      <Pick
        label="Offline product"
        value={variantId}
        options={[
          { value: '', label: 'Choose product' },
          ...items.map((i) => ({ value: i.id, label: i.name + ' / ' + i.sku })),
        ]}
        onChange={(v) => {
          setVariant(v);
          setUnit(items.find((i) => i.id === v)?.units[0]?.id ?? '');
        }}
      />
      <Pick
        label="Offline unit"
        value={unitId}
        options={item?.units.map((u) => ({ value: u.id, label: u.code })) ?? []}
        onChange={setUnit}
      />
      <F label="Quantity" value={quantity} onChange={setQuantity} />
      <F label="Manual discount basis points" value={discount} onChange={setDiscount} />
      <Act
        label="Save line to durable cart"
        onPress={() => void model.add(variantId, unitId, quantity, Number(discount))}
      />
      <Txt>
        {data.cart
          .map(
            (l) =>
              `${items.find((i) => i.id === l.variantId)?.name ?? l.variantId} × ${l.quantity}`,
          )
          .join('; ') || 'Cart empty'}
      </Txt>
      <Txt>Total (minor units): {model.total()}</Txt>
      <F label="Cash received (minor units)" value={cash} onChange={setCash} />
      <Act
        label="Confirm received cash and save pending sale"
        onPress={() => void model.checkout(cash)}
      />
      <Act label="Clear draft cart" onPress={() => void model.clear()} />
    </>
  ) : (
    <Txt>
      Offline permission expired. Reconnect with the original account to renew. Cached products and
      cart are locked.
    </Txt>
  );
}
