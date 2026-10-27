import { useState } from 'react';
import { View } from 'react-native';
import { Text } from './Themed';
import { Action } from './Controls';
import { DisclosureTrigger } from './DisclosureTrigger';
import { NativeIcon } from './NativeIcon';
import { useTheme } from '../theme';
export interface SetupStep {
  id: string;
  title: string;
  path: string;
  done: boolean;
  allowed?: boolean;
}
export function SetupCard({
  title,
  steps,
  onDismiss,
  navigate,
  busy = false,
}: {
  title: string;
  steps: SetupStep[];
  onDismiss?: () => void;
  navigate: (path: string) => void;
  busy?: boolean;
}) {
  const theme = useTheme(),
    [open, setOpen] = useState(false);
  const complete = steps.filter((s) => s.done).length,
    next = steps.find((s) => !s.done);
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        padding: theme.spacing.medium,
        borderRadius: theme.radius,
        gap: theme.spacing.small,
      }}
    >
      <View style={{ flexDirection: 'row', gap: theme.spacing.small }}>
        <NativeIcon name="✓" />
        <Text accessibilityRole="header">{title}</Text>
      </View>
      <Text
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: steps.length,
          now: complete,
          text: `${complete} of ${steps.length} steps complete`,
        }}
      >
        {next ? `${complete} of ${steps.length} steps complete` : 'Setup complete'}
      </Text>
      <View
        style={{
          height: theme.spacing.small,
          backgroundColor: theme.tokens.secondary,
          borderRadius: theme.radius,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${steps.length ? (complete / steps.length) * 100 : 100}%`,
            backgroundColor: theme.colors.primary,
          }}
        />
      </View>
      {next &&
        (next.allowed === false ? (
          <Text>Ask an authorized administrator to continue setup.</Text>
        ) : (
          <Action label="Continue setup" onPress={() => navigate(next.path)} />
        ))}
      {!next && onDismiss && (
        <Action label="Dismiss completed setup" disabled={busy} onPress={onDismiss} />
      )}
      <DisclosureTrigger label="View all steps" expanded={open} onPress={() => setOpen(!open)} />
      {open &&
        steps.map((s) => (
          <View key={s.id}>
            <Text>{s.done ? '✓ Complete' : '○ To do'}</Text>
            {s.allowed === false ? (
              <Text>{s.title} — ask an administrator</Text>
            ) : (
              <Action variant="ghost" label={s.title} onPress={() => navigate(s.path)} />
            )}
          </View>
        ))}
    </View>
  );
}
