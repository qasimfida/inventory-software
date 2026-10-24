import { SidePanel } from '../ui/SidePanel';
import { IconAction } from '../ui/IconAction';
import { Text } from '../ui/Themed';
import { useState } from 'react';
import { View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Action } from '../organization/Controls';
export function BarcodeScanner({
  onCode,
  compact = false,
}: {
  onCode: (code: string) => void;
  compact?: boolean;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  async function openScanner() {
    try {
      const result = permission?.granted ? permission : await requestPermission();
      if (result.granted) {
        setError('');
        setOpen(true);
      } else setError('Camera permission was not granted. Enter the code instead.');
    } catch {
      setError('Camera unavailable. Enter the code instead.');
    }
  }
  return (
    <View>
      {Boolean(error) && <Text accessibilityRole="alert">{error}</Text>}
      {compact ? (
        <IconAction label="Scan product barcode" icon="▥" onPress={() => void openScanner()} />
      ) : (
        <Action label="Scan product barcode" onPress={() => void openScanner()} />
      )}
      {open && (
        <SidePanel title="Barcode scanner" open={open} onClose={() => setOpen(false)}>
          <CameraView
            style={{ height: 240 }}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e', 'qr'],
            }}
            onBarcodeScanned={(result) => {
              setOpen(false);
              onCode(result.data);
            }}
            onMountError={() => {
              setOpen(false);
              setError('Camera unavailable. Enter the code instead.');
            }}
          />
          <Action label="Close scanner" onPress={() => setOpen(false)} />
        </SidePanel>
      )}
    </View>
  );
}
