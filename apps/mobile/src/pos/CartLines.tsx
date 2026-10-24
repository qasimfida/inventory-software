import { CartThumbnail } from './CartThumbnail';
import { useState } from 'react';
import { QuantityControl } from '../ui/QuantityControl';
import { Text } from '../ui/Themed';
import { Pressable, View } from 'react-native';

import { IconAction } from '../ui/IconAction';
import { useTheme } from '../theme';
import { CartLineDetails } from './CartLineDetails';
import type { PosModel, PosState } from '@inventory/api-client';
import { formatMinorUnits } from '@inventory/domain';
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
  const theme = useTheme(),
    [selected, setSelected] = useState<number | null>(null);
  return (
    <View style={{ gap: theme.spacing.small }}>
      {!state.lines.length && (
        <Text tone="muted">Your cart is empty. Choose a product to start a sale.</Text>
      )}
      {state.lines.map((line, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            padding: theme.spacing.small,
            gap: theme.spacing.small,
            backgroundColor: theme.tokens.muted,
            borderRadius: theme.radius,
          }}
        >
          <CartThumbnail
            key={line.images?.[0] ?? 'missing'}
            uri={line.images?.[0]}
            name={line.name}
          />
          <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.small }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View details for ${line.name}`}
                  onPress={() => setSelected(index)}
                  style={{
                    minHeight: parseFloat(theme.tokens['native-target-size']),
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontWeight: '600' }}>{line.name}</Text>
                  <Text tone="muted">{line.sku}</Text>
                </Pressable>
              </View>
              <View
                style={{
                  alignItems: 'flex-end',
                  gap: theme.spacing.small,
                }}
              >
                <IconAction
                  smallIcon
                  icon="×"
                  label={`Remove line ${index + 1}`}
                  disabled={disabled}
                  onPress={() => {
                    setSelected(null);
                    model.remove(index);
                  }}
                />
              </View>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'flex-start',
                width: '100%',
                flexWrap: 'wrap',
                gap: theme.spacing.small,
              }}
            >
              <View style={{ width: parseFloat(theme.tokens['native-target-size']) * 3 }}>
                <QuantityControl
                  compact
                  label={`Quantity ${index + 1}`}
                  value={line.quantity}
                  disabled={disabled}
                  onChange={(quantity) => model.edit(index, { quantity })}
                />
              </View>
              <View
                style={{
                  marginLeft: 'auto',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.small,
                }}
              >
                {canDiscount && (
                  <IconAction
                    smallIcon
                    icon="◇"
                    label={
                      line.manualDiscountBasisPoints
                        ? `${line.manualDiscountBasisPoints / 100}% discount`
                        : 'Add discount'
                    }
                    disabled={disabled}
                    onPress={() => setSelected(index)}
                  />
                )}
                {state.quote?.lines[index] && (
                  <Text tone="info">
                    {formatMinorUnits(
                      state.quote.lines[index].totalMinor,
                      state.quote.lines[index].currency,
                    )}
                  </Text>
                )}
                <Text tone="muted">{line.units.find((unit) => unit.id === line.unitId)?.code}</Text>
              </View>
            </View>
          </View>
        </View>
      ))}
      <CartLineDetails
        key={selected ?? 'closed'}
        index={selected}
        state={state}
        model={model}
        canDiscount={canDiscount}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}
