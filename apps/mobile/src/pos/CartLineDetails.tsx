import { useState } from 'react';
import type { PosModel, PosState } from '@inventory/api-client';
import { percentageBasisPoints, formatMinorUnits } from '@inventory/domain';
import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
import { Field, Action, Choice } from '../ui/Controls';
export function CartLineDetails({
  index,
  model,
  state,
  canDiscount,
  onClose,
}: {
  index: number | null;
  model: PosModel;
  state: PosState;
  canDiscount: boolean;
  onClose: () => void;
}) {
  const line = index === null ? undefined : state.lines[index];
  const quote = index === null ? undefined : state.quote?.lines[index];
  const [discount, setDiscount] = useState(String((line?.manualDiscountBasisPoints ?? 0) / 100)),
    [error, setError] = useState('');
  const disabled = state.busy || state.uncertain;
  return (
    <SidePanel title="Product details" open={!!line} onClose={onClose}>
      {line && index !== null && (
        <>
          <Text accessibilityRole="header">{line.name}</Text>
          <Text>{line.sku}</Text>
          <Text>Quantity: {line.quantity}</Text>
          <Choice
            label={`Unit ${index + 1}`}
            value={line.unitId}
            options={line.units.map((unit) => ({ value: unit.id, label: unit.code }))}
            disabled={disabled}
            onChange={(unitId) => model.edit(index, { unitId })}
          />
          {quote && (
            <>
              <Text>Available stock: {quote.available}</Text>
              <Text>Line total: {formatMinorUnits(quote.totalMinor, quote.currency)}</Text>
            </>
          )}
          <Field
            label="Stock location ID (blank = warehouse root)"
            value={line.locationId ?? ''}
            disabled={disabled}
            onChange={(value) => model.edit(index, { locationId: value || null })}
          />
          {canDiscount && (
            <>
              <Field
                label="Manual discount (%)"
                value={discount}
                onChange={setDiscount}
                disabled={disabled}
              />
              {error && <Text accessibilityRole="alert">{error}</Text>}
              <Action
                label="Apply discount"
                disabled={disabled}
                onPress={() => {
                  try {
                    model.edit(index, {
                      manualDiscountBasisPoints: percentageBasisPoints(discount),
                    });
                    setError('');
                    onClose();
                  } catch {
                    setError('Enter a percentage from 0 to 100 with at most two decimal places.');
                  }
                }}
              />
            </>
          )}
        </>
      )}
    </SidePanel>
  );
}
