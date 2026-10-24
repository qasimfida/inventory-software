import { OverflowTabs } from '@/components/common/OverflowTabs';
import { CompanyProfile } from '@/features/settings/CompanyProfile';
import { useSyncExternalStore } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { routeIcons } from './route-icons';
import { Settings } from 'lucide-react';
import { useId } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { availableRoutes } from '@inventory/api-client';
import { SettingsPanel } from '@/features/settings/SettingsPanel';
import { SecurityPanel } from '@/features/settings/SecurityPanel';
import { PolicyEditor } from '@/features/settings/PolicyEditor';
import { AccountSessions } from '@/features/auth/AccountSessions';
import { LocationEditor } from '@/features/organization/LocationEditor';
import { AuditHistory } from '@/features/organization/AuditHistory';
import { ConnectionPanel } from '@/features/foundation/ConnectionPanel';
import { OfflinePanel } from '@/features/offline/OfflinePanel';
import { settingsModel } from '@/platform/settings';
import { Button } from '@/components/ui/Button';
import { useAccount } from './SessionContext';
import { useWorkspace } from './WorkspaceContext';
import { BusinessSettings } from './BusinessSettings';
export function SettingsPage() {
  const { business, model, state } = useWorkspace(),
    account = useAccount();
  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const path = useLocation().pathname;
  const navigate = useNavigate();
  const panelId = useId();
  const section = path.split('/')[2];
  return (
    <Tabs.Root
      value={path}
      onValueChange={(next) => void navigate(next)}
      className="settings-layout"
    >
      <OverflowTabs>
        <Tabs.List
          className="settings-navigation settings-tabs view-tabs"
          aria-label="Settings navigation"
          loop={false}
        >
          {availableRoutes(business)
            .filter((r) => r.group === 'Settings')
            .map((r) => {
              const Icon = routeIcons[r.path] ?? Settings;
              return (
                <Tabs.Trigger key={r.path} value={r.path} aria-controls={panelId}>
                  <Icon aria-hidden="true" />
                  {r.title}
                </Tabs.Trigger>
              );
            })}
        </Tabs.List>
      </OverflowTabs>
      <Tabs.Content value={path} id={panelId} className="min-w-0 space-y-5">
        {section === 'company' && business && <CompanyProfile business={business} />}
        {section === 'business' && <BusinessSettings />}
        {section === 'profile' && (
          <section className="settings-section space-y-3">
            <h2>Profile</h2>
            <p className="break-all">{account.session?.user.email}</p>
            <p>Account changes and recovery are managed by your trusted account operator.</p>
            <NavLink className="text-primary underline" to="/settings/security">
              Manage active sessions
            </NavLink>
          </section>
        )}
        {section === 'preferences' && (
          <section className="settings-section">
            <SettingsPanel page preferencesOnly />
          </section>
        )}
        {section === 'security' && account.session && (
          <section className="settings-section space-y-4">
            <h2>Sessions & security</h2>
            <AccountSessions session={account.session} busy={account.busy} run={account.run} />
            <SecurityPanel
              section="security"
              platform={settings.snapshot?.canManagePlatform ?? false}
            />
            {settings.snapshot?.canManagePlatform && (
              <PolicyEditor policy={settings.snapshot.platform} platform />
            )}
          </section>
        )}
        {section === 'notifications' && (
          <section className="settings-section">
            <SecurityPanel section="notifications" platform={false} />
          </section>
        )}
        {section === 'device' && (
          <section className="settings-section space-y-4">
            <h2>Device & Offline</h2>
            {import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true' ? (
              <p>
                Demonstration transport. Live readiness checks and offline preparation require a
                live test API.
              </p>
            ) : (
              <ConnectionPanel />
            )}
            <p>
              Prepare this device online. Cached checkout in POS uses an encrypted device vault and
              a time-limited grant. Only server acknowledgements confirm synchronization.
            </p>
            <OfflinePanel />
            <NavLink to="/offline" className="text-primary underline">
              Open cached checkout and recovery
            </NavLink>
          </section>
        )}
        {section === 'locations' && state.workspace && (
          <section className="settings-section">
            <LocationEditor model={model} workspace={state.workspace} busy={state.busy} />
          </section>
        )}
        {section === 'audit' && (
          <section className="settings-section space-y-4">
            <h2>Audit history</h2>
            <Button disabled={state.busy} onClick={() => void model.audit()}>
              View audit history
            </Button>
            <AuditHistory events={state.events} timeZone={business?.timeZone ?? 'UTC'} />
            {state.nextCursor && (
              <Button disabled={state.busy} onClick={() => void model.audit(true)}>
                More audit events
              </Button>
            )}
          </section>
        )}
      </Tabs.Content>
    </Tabs.Root>
  );
}
