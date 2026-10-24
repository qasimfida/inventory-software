import { useState } from 'react';
import type { OfflineWorkspace, VaultState } from '@inventory/api-client';
import { SidePanel } from '../ui/SidePanel';
import { Action, Choice, Field } from '../ui/Controls';
/** Preserve granted alternate units and discounts without cluttering cart lines. */
export function OfflineProductOptions({
  model,
  data,
  variantId,
  close,
}: {
  model: OfflineWorkspace;
  data: VaultState;
  variantId: string;
  close: () => void;
}) {
  const item = data.leases[data.activeLeaseId]!.snapshot.items.find((i) => i.id === variantId)!;
  const [unit, setUnit] = useState(item.units[0]?.id ?? ''),
    [quantity, setQuantity] = useState('1'),
    [discount, setDiscount] = useState('0');
  return (
    <SidePanel title={item.name} open onClose={close}>
      <Choice
        label="Sale unit"
        value={unit}
        onChange={setUnit}
        options={item.units.map((u) => ({ value: u.id, label: u.code }))}
      />
      <Field label="Quantity" value={quantity} onChange={setQuantity} />
      <Field
        label="Manual discount (basis points)"
        value={discount}
        onChange={setDiscount}
        description="Subject to this device’s cached permission limits."
      />
      <Action
        label="Add to cart"
        onPress={() => {
          void model.add(item.id, unit, quantity, Number(discount)).then(() => {
            if (!model.snapshot().error) close();
          });
        }}
      />
    </SidePanel>
  );
}
