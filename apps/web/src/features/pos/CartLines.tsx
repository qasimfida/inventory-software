import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import type { PosModel, PosState } from '@inventory/api-client';
export function CartLines({
  model,
  state,
  canDiscount,
}: {
  model: PosModel;
  state: PosState;
  canDiscount: boolean;
}) {
  const disabled = state.busy || state.uncertain;
  return (
    <ol className="space-y-3">
      {state.lines.map((line, index) => (
        <li key={index} className="rounded border p-3">
          <p>
            {line.sku} · {line.name}
          </p>
          <label htmlFor={`pos-qty-${index}`}>Quantity {index + 1}</label>
          <Input
            id={`pos-qty-${index}`}
            value={line.quantity}
            inputMode="decimal"
            disabled={disabled}
            onChange={(e) => model.edit(index, { quantity: e.target.value })}
          />
          <label htmlFor={`pos-unit-${index}`}>Unit {index + 1}</label>
          <Select
            id={`pos-unit-${index}`}
            value={line.unitId}
            disabled={disabled}
            onChange={(e) => model.edit(index, { unitId: e.target.value })}
          >
            {line.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code}
              </option>
            ))}
          </Select>
          <label htmlFor={`pos-location-${index}`}>Location ID {index + 1} (blank = root)</label>
          <Input
            id={`pos-location-${index}`}
            value={line.locationId ?? ''}
            disabled={disabled}
            onChange={(e) => model.edit(index, { locationId: e.target.value || null })}
          />
          {canDiscount && (
            <>
              <label htmlFor={`pos-discount-${index}`}>Discount basis points {index + 1}</label>
              <Input
                id={`pos-discount-${index}`}
                type="number"
                min="0"
                max="10000"
                value={line.manualDiscountBasisPoints}
                disabled={disabled}
                onChange={(e) =>
                  model.edit(index, { manualDiscountBasisPoints: Number(e.target.value) })
                }
              />
            </>
          )}
          <Button disabled={disabled} onClick={() => model.remove(index)}>
            Remove line {index + 1}
          </Button>
        </li>
      ))}
    </ol>
  );
}
