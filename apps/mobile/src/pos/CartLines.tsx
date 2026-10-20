import { Text, View } from 'react-native';
import { Action, Choice, Field } from '../organization/Controls';
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
    <View>
      {state.lines.map((line, index) => (
        <View key={index}>
          <Text>
            {line.sku} · {line.name}
          </Text>
          <Field
            label={`Quantity ${index + 1}`}
            value={line.quantity}
            disabled={disabled}
            onChange={(quantity) => model.edit(index, { quantity })}
          />
          <Choice
            label={`Unit ${index + 1}`}
            value={line.unitId}
            options={line.units.map((u) => ({ value: u.id, label: u.code }))}
            disabled={disabled}
            onChange={(unitId) => model.edit(index, { unitId })}
          />
          <Field
            label={`Location ID ${index + 1} (blank = root)`}
            value={line.locationId ?? ''}
            disabled={disabled}
            onChange={(locationId) => model.edit(index, { locationId: locationId || null })}
          />
          {canDiscount && (
            <Field
              label={`Discount basis points ${index + 1}`}
              value={String(line.manualDiscountBasisPoints)}
              disabled={disabled}
              onChange={(v) => model.edit(index, { manualDiscountBasisPoints: Number(v) })}
            />
          )}
          <Action
            label={`Remove line ${index + 1}`}
            disabled={disabled}
            onPress={() => model.remove(index)}
          />
        </View>
      ))}
    </View>
  );
}
