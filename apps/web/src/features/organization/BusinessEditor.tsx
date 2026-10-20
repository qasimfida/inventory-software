import type { Business } from '@inventory/contracts';
import { editBusinessSchema } from '@inventory/contracts';
import type { OrganizationModel } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
export function BusinessEditor({
  business,
  model,
  busy,
}: {
  business: Business;
  model: OrganizationModel;
  busy: boolean;
}) {
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void model.refresh(async () => {
          await model.client.editBusiness(
            business.id,
            editBusinessSchema.parse({
              name: data.get('name'),
              timeZone: data.get('timeZone'),
              state: data.get('state'),
              version: business.version,
            }),
          );
        });
      }}
    >
      <fieldset disabled={busy || business.state === 'archived'} className="space-y-2">
        <legend>Edit business</legend>
        <label htmlFor="business-name">Business name</label>
        <Input
          id="business-name"
          name="name"
          defaultValue={business.name}
          required
          maxLength={120}
        />
        <label htmlFor="business-timezone">Business time zone (IANA)</label>
        <Input
          id="business-timezone"
          name="timeZone"
          defaultValue={business.timeZone ?? 'UTC'}
          required
          maxLength={100}
        />
        <label htmlFor="business-state">Business state</label>
        <Select id="business-state" name="state" defaultValue={business.state}>
          {['active', 'suspended', 'archived'].map((state) => (
            <option key={state}>{state}</option>
          ))}
        </Select>
        <p className="text-sm">Suspension blocks child access. Archiving is permanent.</p>
        <Button type="submit">Save business</Button>
      </fieldset>
    </form>
  );
}
