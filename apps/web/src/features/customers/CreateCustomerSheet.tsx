import { useState } from 'react';
import { customerProfileForm } from '@inventory/api-client';
import type { createCustomerClient } from '@inventory/api-client';
import { z } from 'zod';
import { FormSheet } from '@/components/common/FormSheet';
import { CommandForm } from '@/components/common/CommandForm';
import { useAppearance } from '@/theme/Appearance';
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
  const { preferences } = useAppearance();
  const base = customerProfileForm(client, storeId);
  const definition = {
    ...base,
    fields: base.fields.map((f) => ({
      ...f,
      value:
        f.name === 'name' ? name : f.name === 'currency' ? preferences.currency : (f.value ?? ''),
    })),
    submit: async (values: Parameters<typeof base.submit>[0]) => {
      const result = z.object({ id: z.uuid() }).parse(await base.submit(values));
      onCreated(result.id, String(values.name));
      onClose();
      return result;
    },
  };
  return (
    <FormSheet
      title="Add customer"
      open={open}
      onOpenChange={(value) => {
        if (!value && !busy) onClose();
      }}
    >
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy}>
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
                  'Customer was not confirmed. Check the fields and existing records before retrying.',
                ),
              )
              .finally(() => setBusy(false));
          }}
        />
      </fieldset>
    </FormSheet>
  );
}
