import { useFonts } from 'expo-font';
import Karla from '@inventory/design-tokens/fonts/Karla.ttf';
import Lora from '@inventory/design-tokens/fonts/Lora.ttf';
import { lazy, Suspense } from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider } from './theme';
import { NativeApplication } from './shell/NativeApplication';
import { LoadingState } from './ui/AsyncState';
const DemoWorkspace =
  __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true'
    ? lazy(() => import('./shell/DemoWorkspace'))
    : null;
export function App() {
  useFonts({ Karla, Lora });
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ThemeProvider>
        {DemoWorkspace ? (
          <Suspense fallback={<LoadingState message="Loading demonstration…" />}>
            <DemoWorkspace>
              <NativeApplication />
            </DemoWorkspace>
          </Suspense>
        ) : (
          <NativeApplication />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
