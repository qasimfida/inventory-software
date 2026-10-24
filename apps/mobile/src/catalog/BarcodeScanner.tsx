import { Text } from '../ui/Themed';
import type { ComponentType } from 'react';

export const BarcodeScanner: ComponentType<{
  onCode: (code: string) => void;
  compact?: boolean;
}> = () => <Text>Use a keyboard barcode scanner or enter the code in the search field.</Text>;
