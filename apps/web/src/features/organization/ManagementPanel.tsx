import { AccordionSection } from '@/components/ui/Accordion';
import { RefreshCw } from 'lucide-react';
import { EmptyState } from '@/components/common/AsyncState';
import { BusinessPolicy } from '../settings/BusinessPolicy';
import { settingsModel } from '@/platform/settings';
import { ManagementWorkflows } from './ManagementWorkflows';
import { PosPanel } from '../pos/PosPanel';
import { hasPermission } from '@inventory/contracts';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createOrganizationClient, OrganizationModel } from '@inventory/api-client';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { OrganizationSettings } from './OrganizationSettings';
export function ManagementPanel() {
  const [checkout, setCheckout] = useState(false);
  const model = useMemo(
    () => new OrganizationModel(createOrganizationClient(authClient.organizationRequest)),
    [],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    void model.refresh();
    const timer = setInterval(() => void model.revalidate(), 60000);
    return () => {
      clearInterval(timer);
      model.reset();
    };
  }, [model]);
  useEffect(() => {
    const accountId = settingsModel.snapshot().accountId;
    if (accountId) void settingsModel.connect(accountId, state.selectedId);
  }, [state.selectedId]);
  const selected = state.businesses.find((b) => b.id === state.selectedId);
  if (
    checkout &&
    selected &&
    state.workspace &&
    (hasPermission(selected, 'sales.write') ||
      hasPermission(selected, 'sales.read') ||
      hasPermission(selected, 'payments.read'))
  )
    return (
      <PosPanel
        key={JSON.stringify([selected, state.workspace.locations])}
        business={selected}
        locations={state.workspace.locations}
        close={() => setCheckout(false)}
      />
    );
  return (
    <section aria-label="Organization management" className="space-y-4">
      <h2 className="sr-only">Your workspace</h2>
      {state.error && <p role="alert">{state.error}</p>}
      {state.busy && <p role="status">Updating management data…</p>}
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 basis-full space-y-1 sm:max-w-md sm:basis-0">
          <label htmlFor="workspace-business" className="text-sm font-medium">
            Business
          </label>
          <Select
            id="workspace-business"
            value={state.selectedId ?? ''}
            disabled={state.busy}
            onChange={(event) => void model.select(event.target.value)}
          >
            {!state.selectedId && <option value="">Select a business</option>}
            {state.businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.state} · {b.role}
              </option>
            ))}
          </Select>
        </div>
        <Button
          disabled={state.busy}
          onClick={() => void model.refresh()}
          variant="ghost"
          size="icon"
          aria-label="Refresh businesses"
          title="Refresh"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>
      <AccordionSection
        defaultOpen={!state.busy && state.businesses.length === 0}
        title={<>Create a business</>}
      >
        <form
          className="screen-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const name = String(new FormData(form).get('name'));
            void model.refresh(async () => {
              const created = await model.client.create(name);
              form.reset();
              return created.id;
            });
          }}
        >
          <label htmlFor="new-business">New business name</label>
          <Input id="new-business" name="name" required maxLength={120} disabled={state.busy} />
          <Button type="submit" disabled={state.busy}>
            Create business
          </Button>
        </form>
      </AccordionSection>
      {!state.businesses.length && !state.busy && (
        <EmptyState message="No active memberships. Create a business or ask an owner to assign your account." />
      )}
      {selected && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3>{selected.name}</h3>
            {state.workspace &&
              (hasPermission(selected, 'sales.write') ||
                hasPermission(selected, 'sales.read') ||
                hasPermission(selected, 'payments.read')) && (
                <Button onClick={() => setCheckout(true)}>Open point of sale</Button>
              )}
          </div>
          <ManagementWorkflows
            key={selected.id}
            business={selected}
            locations={state.workspace?.locations ?? null}
            administration={
              <>
                <BusinessPolicy business={selected} />
                <OrganizationSettings business={selected} model={model} state={state} />
              </>
            }
          />
        </>
      )}
    </section>
  );
}
