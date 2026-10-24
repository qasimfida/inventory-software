import { useState } from 'react';
import { View } from 'react-native';
import { decodeUtf8 } from '@inventory/api-client';
import type { OfflineWorkspace } from '@inventory/api-client';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { pickLocalFile, saveLocalText } from '../platform/files';
export function VaultRecovery({
  model,
  name,
  password,
  unlocked,
}: {
  model: OfflineWorkspace;
  name: string;
  password: string;
  unlocked: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const run = async (work: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Unable to recover register.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <View>
      <Text accessibilityRole="header">Backup and restore</Text>
      <Text>
        Backups retain encrypted drafts and pending sales. Keep the vault passphrase separately.
        Restore to an unused name; existing data is never overwritten. Synchronize from one
        recovered copy.
      </Text>
      <Action
        label="Save encrypted backup"
        disabled={busy || !unlocked}
        onPress={() =>
          void run(async () => {
            await saveLocalText(
              'inventory-register.backup',
              await model.backup(),
              'application/json',
            );
            setMessage('Encrypted backup ready to save.');
          })
        }
      />
      <Action
        label="Restore encrypted backup"
        disabled={busy || unlocked || !password || !name}
        onPress={() =>
          void run(async () => {
            const file = await pickLocalFile('.backup,.json', 16 * 1024 * 1024);
            if (file) {
              await model.restore(name, decodeUtf8(file.bytes), password);
              setMessage('Backup restored. Original permission expiration still applies.');
            }
          })
        }
      />
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
    </View>
  );
}
