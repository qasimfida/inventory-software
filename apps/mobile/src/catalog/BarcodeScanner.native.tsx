import { useState } from 'react';
import { Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Action } from '../organization/Controls';
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  return (
    <View>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      <Action
        label="Scan product barcode"
        onPress={() => {
          void (async () => {
            try {
              const result = permission?.granted ? permission : await requestPermission();
              if (result.granted) {
                setError('');
                setOpen(true);
              } else setError('Camera permission was not granted. Enter the code instead.');
            } catch {
              setError('Camera unavailable. Enter the code instead.');
            }
          })();
        }}
      />
      {open && (
        <>
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
        </>
      )}
    </View>
  );
}
