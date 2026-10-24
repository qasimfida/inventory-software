import { AccordionSection } from '@/components/ui/Accordion';
import { lazy, Suspense, useRef, useState } from 'react';
const ConfirmDialog = lazy(() =>
  import('@/components/common/ConfirmDialog').then((module) => ({ default: module.ConfirmDialog })),
);
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
  const [state, setState] = useState<string>(business.state);
  const approved = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form
      ref={form}
      className="screen-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (state === 'archived' && !approved.current) return;
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
      <fieldset disabled={busy || business.state === 'archived'} className="screen-form">
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
        <AccordionSection title="Business status and archiving">
          <label htmlFor="business-state">Business state</label>
          <Select
            id="business-state"
            name="state"
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            {['active', 'suspended', 'archived'].map((state) => (
              <option key={state}>{state}</option>
            ))}
          </Select>
          <p className="text-sm">Suspension blocks child access. Archiving is permanent.</p>
        </AccordionSection>
        {state === 'archived' ? (
          <Suspense fallback={<Button disabled>Loading confirmation…</Button>}>
            <ConfirmDialog
              trigger={<Button>Save business</Button>}
              title="Archive this business?"
              description="Archiving is permanent and locks business operations. Review the business before confirming."
              confirmLabel="Confirm archive"
              onConfirm={() => {
                approved.current = true;
                form.current?.requestSubmit();
                approved.current = false;
              }}
            />
          </Suspense>
        ) : (
          <Button type="submit">Save business</Button>
        )}
      </fieldset>
    </form>
  );
}
