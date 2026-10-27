import { useState } from 'react';
import { Alert, View } from 'react-native';
import type { PosModel, PosState } from '@inventory/api-client';
import { Action, Field } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
export function HeldCarts({ model, state }: { model: PosModel; state: PosState }) {
  const [name, setName] = useState(''),
    theme = useTheme(),
    locked = state.busy || state.uncertain;
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text accessibilityRole="header">Held carts ({state.heldCarts.length}/10)</Text>
      <Text>
        Session only. Leaving POS, reload or sign-out clears drafts. No stock is reserved; prices
        are checked again on resume.
      </Text>
      <Field
        label="Cart name (avoid personal information)"
        value={name}
        onChange={setName}
        maxLength={60}
        disabled={locked}
      />
      <Action
        label="Hold current cart"
        disabled={locked || !state.lines.length || !name.trim()}
        onPress={() => model.heldCart({ type: 'hold', name })}
      />
      {state.heldCarts.map((cart) => (
        <View key={cart.name} style={{ gap: theme.spacing.small }}>
          <Text>
            {cart.name} · {cart.lines.length} lines
          </Text>
          <Action
            label={`Resume ${cart.name}`}
            disabled={locked || !!state.lines.length}
            onPress={() => model.heldCart({ type: 'resume', name: cart.name })}
          />
          <Action
            label={`Discard ${cart.name}`}
            disabled={locked}
            variant="outline"
            onPress={() =>
              Alert.alert(
                'Discard held cart?',
                `Discard ${cart.name}? This only removes an unsubmitted session draft.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Discard draft',
                    style: 'destructive',
                    onPress: () => model.heldCart({ type: 'discard', name: cart.name }),
                  },
                ],
              )
            }
          />
        </View>
      ))}
    </View>
  );
}
