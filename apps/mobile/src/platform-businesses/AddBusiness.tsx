import { useNavigation } from '../shell/Navigation';
import { useWorkspace } from '../shell/WorkspaceContext';
import { useState } from 'react';
import { createOrganizationClient } from '@inventory/api-client';
import { createBusinessSchema } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Action, Field } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { SidePanel } from '../ui/SidePanel';
export function AddBusiness({ onCreated }: { onCreated?: () => void }) {
  const { model, locked } = useWorkspace(),
    { navigate } = useNavigation();
  const [created, setCreated] = useState<string | null>(null);
  const [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function create() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const business = await createOrganizationClient(authClient.organizationRequest).create(
        createBusinessSchema.parse({ name }).name,
      );
      setCreated(business.id);
      await model.revalidate();
      onCreated?.();
    } catch {
      setError('Unable to create the business. Check the name and connection before retrying.');
    } finally {
      setBusy(false);
    }
  }
  async function setup(path: string) {
    if (!created || busy) return;
    setBusy(true);
    setError('');
    await model.select(created);
    if (model.snapshot().workspace?.business.id === created) {
      setOpen(false);
      navigate(path);
    } else setError('Your business was created. Reconnect to open its setup.');
    setBusy(false);
  }
  return (
    <>
      <Action
        label="＋ Add business"
        disabled={locked}
        onPress={() => {
          setCreated(null);
          setName('');
          setError('');
          setOpen(true);
        }}
      />
      <SidePanel
        title={created ? 'Business created' : 'Add business'}
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        {created ? (
          <>
            <Text accessibilityRole="status">{name} is ready. Choose the next setup step.</Text>
            <Action
              label="Add stores and warehouses"
              disabled={busy}
              onPress={() => void setup('/settings/locations')}
            />
            <Action
              label="Company details and branding"
              disabled={busy}
              onPress={() => void setup('/settings/company')}
            />
            <Action
              label="Assign team access"
              disabled={busy}
              onPress={() => void setup('/team')}
            />
          </>
        ) : (
          <>
            <Text>
              Your account becomes the initial owner using the existing registration flow.
            </Text>
            <Field
              label="Business name"
              value={name}
              onChange={setName}
              disabled={busy}
              maxLength={120}
            />

            <Action
              label={busy ? 'Creating business…' : 'Create business'}
              disabled={busy || !name.trim()}
              onPress={() => void create()}
            />
          </>
        )}
        {!!error && <Text accessibilityRole="alert">{error}</Text>}
      </SidePanel>
    </>
  );
}
