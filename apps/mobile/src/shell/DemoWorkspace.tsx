import { cloneElement, useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { demoController, demoRoles } from '@inventory/api-client/mock';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
export default function DemoWorkspace({ children }: { children: ReactElement }) {
  const generation = useSyncExternalStore(demoController.subscribe, demoController.getSnapshot),
    theme = useTheme(),
    insets = useSafeAreaInsets();
  const roles = demoRoles,
    scenarios = [
      'normal',
      'empty',
      'error',
      'offline',
      'denied',
      'stale',
      'partial',
      'slow',
      'rate-limited',
      'store-live',
      'store-all-clear',
      'store-no-catalog',
      'store-disabled',
      'store-sold-out-hidden',
    ] as const;
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          padding: theme.spacing.small,
          paddingTop: Math.max(insets.top, theme.spacing.small),
          backgroundColor: theme.tokens.secondary,
        }}
      >
        <Text>Demo · local data only</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
          <Action
            label={`Role: ${demoController.role}`}
            onPress={() =>
              demoController.configure(
                roles[(roles.indexOf(demoController.role) + 1) % roles.length]!,
                demoController.scenario,
              )
            }
          />
          <Action
            label={`Scenario: ${demoController.scenario}`}
            onPress={() =>
              demoController.configure(
                demoController.role,
                scenarios[(scenarios.indexOf(demoController.scenario) + 1) % scenarios.length]!,
              )
            }
          />
        </View>
      </View>
      {cloneElement(children, { key: generation })}
    </View>
  );
}
