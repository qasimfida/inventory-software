import { useState } from 'react';
import type { OfflineWorkspace } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { pickLocalFile, saveLocalText } from '@/platform/files';
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
    <section className="space-y-2" aria-label="Cached register backups">
      <h3>Backup and restore</h3>
      <p>
        Backups retain encrypted drafts and pending sales. Keep the vault passphrase separately.
        Restore to an unused vault name; existing data is never overwritten. Synchronize from one
        recovered copy to avoid competing drafts.
      </p>
      <Button
        variant="outline"
        disabled={busy || !unlocked}
        onClick={() =>
          void run(async () => {
            await saveLocalText(
              'inventory-register.backup',
              await model.backup(),
              'application/json',
            );
            setMessage('Encrypted backup downloaded.');
          })
        }
      >
        Download encrypted backup
      </Button>
      <Button
        variant="outline"
        disabled={busy || unlocked || !password || !name}
        onClick={() =>
          void run(async () => {
            const file = await pickLocalFile('.backup,.json', 16 * 1024 * 1024);
            if (file) {
              await model.restore(name, new TextDecoder().decode(file.bytes), password);
              setMessage('Backup restored. Original permission expiration still applies.');
            }
          })
        }
      >
        Restore encrypted backup
      </Button>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
