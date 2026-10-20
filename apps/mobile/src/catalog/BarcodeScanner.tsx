import type { ComponentType } from 'react';
import { Text } from 'react-native';
export const BarcodeScanner: ComponentType<{ onCode: (code: string) => void }> = () => (
  <Text>Use a keyboard barcode scanner or enter the code in the search field.</Text>
);
