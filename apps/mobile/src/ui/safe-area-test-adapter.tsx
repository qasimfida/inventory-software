// jsdom has no native inset bridge. Device/emulator checks verify real safe-area measurement.
import type { ReactNode } from 'react';
import { View } from 'react-native';
export const SafeAreaView = View;
export const initialWindowMetrics = null;
export function SafeAreaProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
