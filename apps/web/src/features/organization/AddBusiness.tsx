import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2, MapPin, Users } from 'lucide-react';
import { createBusinessSchema } from '@inventory/contracts';
import { useWorkspace } from '@/shell/WorkspaceContext';
import { FormSheet } from '@/components/common/FormSheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
/** Registration uses the existing owner assignment; subsequent setup commands remain independent. */
export function AddBusiness({ onCreated }: { onCreated?: () => void }) {
  const { model, locked } = useWorkspace(),
    navigate = useNavigate();
  const [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [created, setCreated] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function create() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const business = await model.client.create(createBusinessSchema.parse({ name }).name);
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
      void navigate(path);
    } else setError('Your business was created. Reconnect to open its setup.');
    setBusy(false);
  }
  return (
    <>
      <Button
        disabled={locked}
        onClick={() => {
          setOpen(true);
          setCreated(null);
          setName('');
          setError('');
        }}
      >
        <Plus />
        Add business
      </Button>
      <FormSheet
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
        title={created ? 'Business created' : 'Add business'}
        description={
          created
            ? 'Choose the next setup step. You can finish the others later from Settings.'
            : 'Start with a name. Your account becomes the initial owner.'
        }
      >
        {created ? (
          <div className="space-y-4">
            <p role="status">{name} is ready.</p>
            <Button disabled={busy} onClick={() => void setup('/settings/locations')}>
              <MapPin />
              Add stores and warehouses
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void setup('/settings/company')}
            >
              <Building2 />
              Company details and branding
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void setup('/team')}>
              <Users />
              Assign team access
            </Button>
          </div>
        ) : (
          <form
            className="screen-form"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <label htmlFor="registered-business-name">Business name</label>
            <Input
              id="registered-business-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              disabled={busy}
            />
            <Button type="submit" loading={busy}>
              Create business
            </Button>
          </form>
        )}
        {error && <p role="alert">{error}</p>}
      </FormSheet>
    </>
  );
}
