import { NativeIcon } from './NativeIcon';
import { Action } from './Controls';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Text } from './Themed';

/** Feedback presentation only; callers retain the original visibility and message. */
export function LoadingState({ message = 'Loading…' }: { message?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.small }}>
      <Text accessibilityLiveRegion="polite" tone="muted">
        {message}
      </Text>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={message}
        accessibilityState={{ busy: true }}
        style={{
          height: theme.spacing.small,
          backgroundColor: theme.tokens.muted,
          borderRadius: theme.radius,
        }}
      >
        <View
          style={{
            height: '100%',
            width: '35%',
            backgroundColor: theme.colors.primary,
            borderRadius: theme.radius,
          }}
        />
      </View>
      {theme.preferences.states === 'enhanced' && (
        <View
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ gap: theme.spacing.small }}
        >
          {(['75%', '50%'] as const).map((width) => (
            <View
              key={width}
              style={{
                width,
                height: theme.spacing.medium,
                backgroundColor: theme.tokens.muted,
                borderRadius: theme.radius,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
export function EmptyState({
  message,
  announce = false,
  action,
  description = 'There are no records to display here yet.',
}: {
  description?: string | undefined;
  message: string;
  announce?: boolean;
  action?: { label: string; onPress: () => void } | undefined;
}) {
  const theme = useTheme();
  const enhanced = theme.preferences.states === 'enhanced';
  return (
    <View
      style={{
        gap: theme.spacing.small,
        padding: enhanced ? theme.spacing.large : 0,
        backgroundColor: enhanced ? theme.tokens.card : 'transparent',
        borderRadius: theme.radius,
      }}
    >
      {enhanced && <NativeIcon name="search" />}
      <Text
        accessibilityLiveRegion={announce ? 'polite' : undefined}
        style={enhanced ? { fontWeight: '600' } : undefined}
      >
        {message}
      </Text>
      {enhanced && <Text tone="muted">{description}</Text>}
      {enhanced && action && (
        <Action variant="outline" label={action.label} onPress={action.onPress} />
      )}
    </View>
  );
}
export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useTheme();
  const enhanced = theme.preferences.states === 'enhanced';
  return (
    <View
      style={{
        gap: theme.spacing.small,
        padding: enhanced ? theme.spacing.medium : 0,
        backgroundColor: theme.tokens.card,
        borderRadius: theme.radius,
      }}
    >
      {enhanced && <NativeIcon name="cloud" color={theme.tokens.destructive} />}
      {enhanced && <Text accessibilityRole="header">Unable to load this view</Text>}
      <Text accessibilityRole="alert">{message}</Text>
      <Action label="Try again" onPress={onRetry} />
    </View>
  );
}
