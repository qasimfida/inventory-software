import type { PosModel, PosState } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
import { FormSheet } from '@/components/common/FormSheet';
import { Input } from '@/components/ui/FormControls';
export function CartLineDetails({
  index,
  model,
  state,
  onClose,
}: {
  index: number | null;
  model: PosModel;
  state: PosState;
  onClose: () => void;
}) {
  const line = index === null ? undefined : state.lines[index];
  const quote = index === null ? undefined : state.quote?.lines[index];
  return (
    <FormSheet
      title="Product details"
      open={!!line}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      description="Selected cart item. Stock and final prices are verified by the server."
    >
      {line && index !== null && (
        <>
          <h3>{line.name}</h3>
          <dl className="record-details">
            <dt>SKU</dt>
            <dd>{line.sku}</dd>
            <dt>Unit</dt>
            <dd>{line.units.find((unit) => unit.id === line.unitId)?.code}</dd>
            <dt>Quantity</dt>
            <dd>{line.quantity}</dd>
            <dt>Manual discount</dt>
            <dd>{line.manualDiscountBasisPoints / 100}%</dd>
            {quote && (
              <>
                <dt>Available stock</dt>
                <dd>{quote.available}</dd>
                <dt>Line total</dt>
                <dd>{formatMinorUnits(quote.totalMinor, quote.currency)}</dd>
              </>
            )}
          </dl>
          <label htmlFor="cart-detail-location">Stock location ID (blank = warehouse root)</label>
          <Input
            id="cart-detail-location"
            value={line.locationId ?? ''}
            disabled={state.busy || state.uncertain}
            onChange={(e) => model.edit(index, { locationId: e.target.value || null })}
          />
        </>
      )}
    </FormSheet>
  );
}
