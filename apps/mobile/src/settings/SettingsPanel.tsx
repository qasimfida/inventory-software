import { PreferenceFields } from './PreferenceFields';
import { IconAction } from '../ui/IconAction';
import { SettingSwitch } from '../ui/SettingSwitch';
import { metrics } from '../ui/metrics';
import { useTheme } from '../theme';
import { Surface } from '../ui/Surface';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { settingsModel } from './model';
import { Text } from '../ui/Themed';
import { styles } from '../ui/Controls';
import { PolicyEditor } from './PolicyEditor';
import { SecurityPanel } from './SecurityPanel';
export function SettingsPanel({
  page = false,
  preferencesOnly = false,
}: {
  page?: boolean;
  preferencesOnly?: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(page || preferencesOnly);
  const state = useSyncExternalStore(
    settingsModel.subscribe,
    settingsModel.snapshot,
    settingsModel.snapshot,
  );
  const effective = settingsModel.effective();
  return (
    <View style={styles.group}>
      <DisclosureTrigger
        expanded={open}
        label={preferencesOnly ? 'Preferences' : 'Settings, connectivity and security'}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Surface muted>
            <Text accessibilityRole="header">Typography &amp; color</Text>
            <Text style={{ fontSize: metrics.title * 2 }}>Aa123</Text>
            <Text>Your type · Clear at every size</Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: theme.spacing.small + metrics.unit,
              }}
            >
              {[
                {
                  label: 'Primary',
                  background: theme.colors.primary,
                  foreground: theme.colors.onPrimary,
                },
                {
                  label: 'Surface',
                  background: theme.colors.card,
                  foreground: theme.colors.foreground,
                },
              ].map((swatch) => (
                <View
                  key={swatch.label}
                  style={{
                    padding: theme.spacing.medium + metrics.unit,
                    borderRadius: theme.radius,
                    backgroundColor: swatch.background,
                  }}
                >
                  <Text style={{ color: swatch.foreground }}>{swatch.label}</Text>
                </View>
              ))}
            </View>
          </Surface>
          <Text>
            Appearance follows your account across businesses; cosmetic policies do not override it.
            Changes save online. Currency and list-loading policies still apply. Display currency
            shows indicative equivalents alongside original prices. Transaction currencies and
            payment amounts do not change.
          </Text>
          {state.message ? <Text accessibilityRole="alert">{state.message}</Text> : null}
          <IconAction
            label="Refresh settings"
            disabled={state.busy}
            onPress={() => void settingsModel.connect(state.accountId, state.businessId)}
            icon="↻"
          />
          <Text accessibilityLiveRegion="polite" tone="muted">
            Current display: {theme.preferences.density} density · {theme.preferences.controlSize}{' '}
            controls · {theme.preferences.animation} animation · {theme.preferences.charts} charts.{' '}
            Device reduced motion and low-power constraints take priority without changing your
            saved choices.
          </Text>
          <PreferenceFields />
          <SettingSwitch
            label="Advanced · Optional visual effects"
            value={effective.effects}
            disabled={state.busy || !state.snapshot}
            onChange={(value) => void settingsModel.save({ effects: value })}
          />
          <Text>
            Bundled and system fonts. Operating-system reduced motion takes priority. Device text
            scaling remains enabled. Enhanced visualizations load only when an available feature
            requests them.
          </Text>
          {!preferencesOnly && state.snapshot?.canManagePlatform && (
            <PolicyEditor
              key={`platform-${state.snapshot.platform.version}`}
              policy={state.snapshot.platform}
              platform
            />
          )}
          {!preferencesOnly && (
            <>
              <Text>
                Online readiness is available in Connectivity below. Offline cash requires a
                prepared, unlocked register with an unexpired grant. Pending, retry and conflict
                status appears in Offline register. Local shared-network deployment requires an
                operator-configured HTTPS service. Discovery and multi-server replication are
                unavailable.
              </Text>
              <SecurityPanel platform={state.snapshot?.canManagePlatform ?? false} />
            </>
          )}
        </>
      )}
    </View>
  );
}
