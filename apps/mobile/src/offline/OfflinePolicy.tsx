import { useState } from 'react';
import { createSyncClient, offlinePolicyForm } from '@inventory/api-client';
import type { CommandForm as Form } from '@inventory/api-client';
import { Action } from '../organization/Controls';
import { CommandForm } from '../components/CommandForm';
import { Text, View } from 'react-native';
import { authClient } from '../auth/client';
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
    <View>
      <Action label="Owner: load offline policy" onPress={() => void load()} />
      <Text>{error}</Text>
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
    </View>
  );
}
