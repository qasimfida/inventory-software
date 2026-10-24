import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { AddBusiness } from '@/features/organization/AddBusiness';
import { useNavigate } from 'react-router-dom';
import { hasPermission } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
import { BusinessEditor } from '@/features/organization/BusinessEditor';
import { BusinessPolicy } from '@/features/settings/BusinessPolicy';
import { useWorkspace } from './WorkspaceContext';
export function BusinessSettings({ onboarding = false }: { onboarding?: boolean }) {
  const { model, state, business, locked } = useWorkspace(),
    navigate = useNavigate();
  return (
    <section className="settings-section space-y-5" aria-label="Business settings">
      <h2>{onboarding ? 'Set up your workspace' : 'Business settings'}</h2>
      <p className="text-muted-foreground">
        Switch between your authorized memberships, or create a business. Staff accounts join
        through invitations and owner assignment.
      </p>
      {state.businesses.length > 0 && (
        <div>
          <label htmlFor="workspace-business">Active business</label>
          <Select
            id="workspace-business"
            value={state.selectedId ?? ''}
            disabled={state.busy || locked}
            onChange={(e) => void model.select(e.target.value)}
          >
            {state.businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.role} · {b.state}
              </option>
            ))}
          </Select>
        </div>
      )}
      <Button
        variant="outline"
        disabled={state.busy || locked}
        onClick={() => void model.refresh()}
      >
        Refresh businesses
      </Button>
      <WorkspaceSwitcher close={() => undefined} />
      <AddBusiness />

      {business && (
        <div className="flex flex-wrap gap-3">
          {hasPermission(business, 'business.write') && (
            <Button variant="outline" onClick={() => void navigate('/settings/company')}>
              Company profile and branding
            </Button>
          )}
          {hasPermission(business, 'locations.write') && (
            <Button variant="outline" onClick={() => void navigate('/settings/locations')}>
              Stores and warehouses
            </Button>
          )}
          {hasPermission(business, 'users.read') && (
            <Button variant="outline" onClick={() => void navigate('/team')}>
              Team and permissions
            </Button>
          )}
        </div>
      )}
      {business && hasPermission(business, 'business.write') && (
        <>
          <BusinessEditor
            key={`${business.id}-${business.version}`}
            business={business}
            model={model}
            busy={state.busy}
          />
          <BusinessPolicy business={business} />
        </>
      )}
    </section>
  );
}
