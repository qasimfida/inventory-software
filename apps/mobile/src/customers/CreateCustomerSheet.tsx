import { useState } from 'react';
import { View } from 'react-native';
import { customerProfileForm } from '@inventory/api-client';
import type { createCustomerClient } from '@inventory/api-client';
import { z } from 'zod';
import { SidePanel } from '../ui/SidePanel';
import { Text } from '../ui/Themed';
import { CommandForm } from '../components/CommandForm';
import { useTheme } from '../theme';
export function CreateCustomerSheet({
  client,
  storeId,
  name,
  open,
  onClose,
  onCreated,
}: {
  client: ReturnType<typeof createCustomerClient>;
  storeId: string;
  name: string;
  open: boolean;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const theme = useTheme();
  const base = customerProfileForm(client, storeId);
  const definition = {
    ...base,
    fields: base.fields.map((f) => ({
      ...f,
      value:
        f.name === 'name'
          ? name
          : f.name === 'currency'
            ? theme.preferences.currency
            : (f.value ?? ''),
    })),
    submit: async (values: Parameters<typeof base.submit>[0]) => {
      const result = z.object({ id: z.uuid() }).parse(await base.submit(values));
      onCreated(result.id, String(values.name));
      onClose();
      return result;
    },
  };
  return (
    <SidePanel
      title="Add customer"
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      <View pointerEvents={busy ? 'none' : 'auto'}>
        <CommandForm
          inline
          definition={definition}
          run={(work) => {
            if (busy) return;
            setBusy(true);
            setError('');
            void work()
              .catch(() =>
                setError(
                  'Customer was not confirmed. Check fields and existing records before retrying.',
                ),
              )
              .finally(() => setBusy(false));
          }}
        />
      </View>
    </SidePanel>
  );
}
