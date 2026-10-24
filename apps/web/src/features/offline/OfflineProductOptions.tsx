import { useState } from 'react';
import type { OfflineWorkspace, VaultState } from '@inventory/api-client';
import { FormSheet } from '@/components/common/FormSheet';
import { F, Pick, Act, Txt } from '@/components/common/WorkspaceControls';
/** Alternate units and granted discounts are selected before adding a line. */
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
    <FormSheet
      title={item.name}
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Pick
        label="Sale unit"
        value={unit}
        onChange={setUnit}
        options={item.units.map((u) => ({ value: u.id, label: u.code }))}
      />
      <F label="Quantity" value={quantity} onChange={setQuantity} />
      <F label="Manual discount (basis points)" value={discount} onChange={setDiscount} />
      <Txt>Subject to this device’s cached permission limits.</Txt>
      <Act
        label="Add to cart"
        onPress={() => {
          void model.add(item.id, unit, quantity, Number(discount)).then(() => {
            if (!model.snapshot().error) close();
          });
        }}
      />
    </FormSheet>
  );
}
