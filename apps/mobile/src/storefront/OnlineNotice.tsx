import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { useTheme } from '../theme';
/** Native inline announcement stays reachable inside the page; no overlay obscures actions. */
export function OnlineNotice({ message }: { message: string }) {
  const [dismissed, setDismissed] = useState(false),
    theme = useTheme();
  if (!message || dismissed) return null;
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        padding: theme.spacing.medium,
        gap: theme.spacing.small,
      }}
    >
      <Text accessibilityLiveRegion="polite">{message}</Text>
      <Action label="Dismiss confirmation" variant="outline" onPress={() => setDismissed(true)} />
    </View>
  );
}
