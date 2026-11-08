import { EffectiveAppearance } from './EffectiveAppearance';
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
        Appearance follows your account across businesses; cosmetic policies do not override it.
        Changes save online. Currency and list-loading policies still apply. Display currency shows
        indicative equivalents alongside original prices. Transaction currencies and payment amounts
        do not change.
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
      <EffectiveAppearance />
      <PreferenceFields />
      <Switch
        label="Advanced · Optional shadows and visual effects"
        description="Changes save to your account immediately."
        checked={effective.effects}
        disabled={state.busy || !state.snapshot}
        onCheckedChange={(effects) => void settingsModel.save({ effects })}
      />
      <p className="text-sm">
        Bundled fonts work offline. Existing device fonts retain their fallback. Reduced-motion
        accessibility overrides animation. Enhanced visualizations do not download charts or 3D
        assets.
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
    </AccordionSection>
  );
}
