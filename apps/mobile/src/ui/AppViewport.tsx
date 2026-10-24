import { ScrollEvents, useScrollEvents } from './ScrollEvents';
import type { ReactNode } from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

/** One scroll owner; OS insets protect controls without changing screen state. */
export function AppViewport({ children }: { children: ReactNode }) {
  const scrollEvents = useScrollEvents();
  const theme = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      <ScrollEvents.Provider value={scrollEvents}>
        <ScrollView
          onScroll={scrollEvents.notify}
          scrollEventThrottle={100}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={{
            flexGrow: 1,
            padding: theme.spacing.medium,
            backgroundColor: theme.colors.background,
          }}
        >
          {children}
        </ScrollView>
      </ScrollEvents.Provider>
    </SafeAreaView>
  );
}
