import { ScrollableTabs } from '../ui/ScrollableTabs';
import { NativeIcon } from '../ui/NativeIcon';
import { CompanyProfile } from '../settings/CompanyProfile';
import { availableRoutes } from '@inventory/api-client';
import { Pressable } from 'react-native';
import { CursorPagination } from '../ui/CursorPagination';
import { IconAction } from '../ui/IconAction';
import { lockOffline } from '../offline/offline-lock';
import { View } from 'react-native';
import { useSyncExternalStore } from 'react';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { AppearanceControl } from '../ui/AppearanceControl';
import { SettingsPanel } from '../settings/SettingsPanel';
import { SecurityPanel } from '../settings/SecurityPanel';
import { PolicyEditor } from '../settings/PolicyEditor';
import { settingsModel } from '../settings/model';
import { ConnectionTools } from '../settings/ConnectionTools';
import { AccountSessions } from '../auth/AccountSessions';
import { authClient } from '../auth/client';
import { OfflinePanel } from '../offline/OfflinePanel';
import { LocationEditor } from '../organization/LocationEditor';
import { AuditHistory } from '../organization/AuditHistory';
import { useAccount } from './SessionContext';
import { useWorkspace } from './WorkspaceContext';
import { useNavigation } from './Navigation';
import { BusinessSettings } from './BusinessSettings';
import { useTheme } from '../theme';
export function SettingsScreen() {
  return <SettingsBody />;
}
export function SettingsTabs() {
  const { path, navigate } = useNavigation(),
    { business } = useWorkspace(),
    theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <ScrollableTabs>
        {availableRoutes(business)
          .filter((r) => r.group === 'Settings')
          .map((r) => (
            <Pressable
              key={r.path}
              accessibilityRole="tab"
              accessibilityState={{ selected: r.path === path }}
              onPress={() => navigate(r.path)}
              style={{
                padding: theme.spacing.small,
                minHeight: parseFloat(theme.tokens['native-target-size']),
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.small,
                borderRadius: theme.controlRadius,
                backgroundColor: r.path === path ? theme.colors.card : 'transparent',
              }}
            >
              <NativeIcon
                name={
                  r.path.endsWith('/profile')
                    ? 'user'
                    : r.path.endsWith('/notifications')
                      ? 'bell'
                      : r.path.endsWith('/preferences')
                        ? '☷'
                        : r.path.endsWith('/security')
                          ? '◇'
                          : '⚙'
                }
              />
              <Text style={{ fontSize: parseFloat(theme.tokens['font-label']) }}>{r.title}</Text>
            </Pressable>
          ))}
      </ScrollableTabs>
    </View>
  );
}
function SettingsBody() {
  const { path, navigate } = useNavigation(),
    account = useAccount(),
    { state, model, business } = useWorkspace(),
    theme = useTheme();
  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  if (path === '/settings/company' && business) return <CompanyProfile business={business} />;
  if (path === '/settings/business') return <BusinessSettings />;
  if (path === '/settings/preferences') return <SettingsPanel page preferencesOnly />;
  if (path === '/settings/profile')
    return (
      <View style={{ gap: theme.spacing.medium }}>
        <Text>{account.session?.user.email}</Text>
        <Text>{business?.name ?? 'No active business'}</Text>
        {availableRoutes(business).some((r) => r.path === '/settings/business') && (
          <Action label="Business settings" onPress={() => navigate('/settings/business')} />
        )}
        <Action label="Preferences" onPress={() => navigate('/settings/preferences')} />
        <AppearanceControl />
        <Action
          label="Sign out"
          disabled={account.busy}
          onPress={() =>
            void account.run(async () => {
              lockOffline();
              await authClient.logout();
              return null;
            })
          }
        />
      </View>
    );
  if (path === '/settings/security')
    return (
      <>
        <AccountSessions {...account} session={account.session!} />
        <SecurityPanel
          section="security"
          platform={settings.snapshot?.canManagePlatform ?? false}
        />
        {settings.snapshot?.canManagePlatform && (
          <PolicyEditor policy={settings.snapshot.platform} platform />
        )}
      </>
    );
  if (path === '/settings/notifications')
    return <SecurityPanel section="notifications" platform={false} />;
  if (path === '/settings/device')
    return (
      <>
        {__DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true' ? (
          <Text>
            Demonstration transport. Live readiness checks and offline preparation require a live
            test API.
          </Text>
        ) : (
          <ConnectionTools />
        )}
        <OfflinePanel />
      </>
    );
  if (path === '/settings/locations' && state.workspace)
    return <LocationEditor workspace={state.workspace} model={model} busy={state.busy} />;
  if (path === '/settings/audit')
    return (
      <>
        <IconAction
          label="Refresh audit history"
          disabled={state.busy}
          onPress={() => void model.audit()}
          icon="↻"
        />
        <AuditHistory events={state.events} timeZone={business?.timeZone ?? 'UTC'} />
        {state.nextCursor && (
          <CursorPagination
            label="audit events"
            hasMore={Boolean(state.nextCursor)}
            busy={state.busy}
            onNext={() => void model.audit(true)}
          />
        )}
      </>
    );
  return null;
}
