import { AccordionSection } from '@/components/ui/Accordion';
import { PreferenceFields } from './PreferenceFields';
import { RefreshCw } from 'lucide-react';
import { Switch } from '@/components/ui/Switch';
import { useSyncExternalStore } from 'react';
import { settingsModel } from '@/platform/settings';
import { Button } from '@/components/ui/Button';
import { ConnectionPanel } from '../foundation/ConnectionPanel';
import { PolicyEditor } from './PolicyEditor';
import { SecurityPanel } from './SecurityPanel';
export function SettingsPanel({
  page = false,
  preferencesOnly = false,
}: {
  page?: boolean;
  preferencesOnly?: boolean;
}) {
  const state = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const effective = settingsModel.effective();
  return (
    <AccordionSection
      defaultOpen={page || preferencesOnly || undefined}
      aria-label="Account settings"
      className="settings-page space-y-5"
      title={
        <>{preferencesOnly ? 'Appearance & performance' : 'Settings, connectivity and security'}</>
      }
    >
      <div className="settings-preview">
        <div>
          <p className="text-sm text-muted-foreground">Typography &amp; color</p>
          <p className="type-specimen">Aa123</p>
          <p>Your type · Clear at every size</p>
        </div>
        <div className="palette-preview" aria-label="Theme colors">
          <span className="bg-primary text-primary-foreground">Primary</span>
          <span className="bg-card text-foreground">Surface</span>
          <span className="bg-foreground text-background">Text</span>
        </div>
      </div>
      <p>
        Preferences belong to your account. Business and platform policies may enforce values.
        Changes require a connection. Currency selects the overview’s transaction currency; existing
        prices and receipts keep their recorded currency.
      </p>
      {state.message && <p role="alert">{state.message}</p>}
      <Button
        disabled={state.busy}
        onClick={() => void settingsModel.connect(state.accountId, state.businessId)}
        variant="ghost"
        size="icon"
        aria-label="Refresh settings"
        title="Refresh"
      >
        <RefreshCw aria-hidden="true" />
      </Button>
      <PreferenceFields />
      <Switch
        label="Optional shadows and visual effects"
        description="Changes save to your account immediately."
        checked={effective.effects}
        disabled={
          state.busy ||
          !state.snapshot ||
          state.snapshot.platform.values.enforced.effects !== undefined ||
          state.business?.values.enforced.effects !== undefined
        }
        onCheckedChange={(effects) => void settingsModel.save({ effects })}
      />
      <p className="text-sm">
        Bundled and system fonts. Reduced-motion accessibility overrides animation. Enhanced
        visualizations do not download charts or 3D assets.
      </p>
      {!preferencesOnly && state.snapshot?.canManagePlatform && (
        <PolicyEditor
          key={`platform-${state.snapshot.platform.version}`}
          policy={state.snapshot.platform}
          platform
        />
      )}
      {!preferencesOnly && <ConnectionPanel />}
      {!preferencesOnly && (
        <p>
          Offline cash requires a prepared, unlocked register and an unexpired grant. Pending
          operations and retry/conflict status appear in the Offline register section. Local
          shared-network deployment requires an operator-configured HTTPS service; automatic
          discovery and multi-server replication are unavailable.
        </p>
      )}
      {!preferencesOnly && <SecurityPanel platform={state.snapshot?.canManagePlatform ?? false} />}
      {import.meta.env.DEV && (
        <a className="text-primary underline" href="#/design-system">
          Components / Design system
        </a>
      )}
    </AccordionSection>
  );
}
