import { useState } from 'react';
import { createSyncClient, offlinePolicyForm } from '@inventory/api-client';
import type { CommandForm as Form } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { CommandForm } from '@/components/common/CommandForm';
import { authClient } from '@/platform/auth-client';
export function OfflinePolicy({ businessId }: { businessId: string }) {
  const [form, setForm] = useState<Form | null>(null),
    [error, setError] = useState('');
  async function load() {
    try {
      const c = createSyncClient(authClient.organizationRequest, businessId);
      setForm(offlinePolicyForm(c, await c.policy()));
    } catch {
      setError('Sign in as a business owner and enter the business ID.');
    }
  }
  return (
    <div>
      <Button onClick={() => void load()}>Owner: load offline policy</Button>
      <p role="alert">{error}</p>
      {form && (
        <CommandForm
          definition={form}
          key={JSON.stringify(form.fields)}
          run={(work) => {
            void (async () => {
              try {
                await work();
                await load();
              } catch {
                setError('Policy save failed; review values and current permissions.');
              }
            })();
          }}
        />
      )}
    </div>
  );
}
