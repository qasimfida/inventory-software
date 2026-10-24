import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '../ui/Themed';
import { settingsModel } from '../settings/model';
import { useSyncExternalStore } from 'react';
import { Action } from '../ui/Controls';
import { IconAction } from '../ui/IconAction';
import { NativeIcon } from '../ui/NativeIcon';
import { SettingSwitch } from '../ui/SettingSwitch';
import { SidePanel } from '../ui/SidePanel';
import { SettingsPanel } from '../settings/SettingsPanel';
import { OfflinePanel } from '../offline/OfflinePanel';
import { authClient } from '../auth/client';
import { lockOffline } from '../offline/offline-lock';
import { useAccount } from './SessionContext';
import { useWorkspace } from './WorkspaceContext';
import { useNavigation } from './Navigation';
import { useTheme } from '../theme';
import { ProfileIdentity } from './ProfileIdentity';
export function NativeProfileMenu({ preferences = false }: { preferences?: boolean }) {
  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const theme = useTheme(),
    account = useAccount(),
    { business } = useWorkspace(),
    { navigate } = useNavigation();
  const [page, setPage] = useState<'profile' | 'preferences' | 'offline' | 'theme' | null>(null);
  return (
    <>
      {preferences ? (
        <IconAction label="Open profile menu" icon="⌄" onPress={() => setPage('profile')} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile menu"
          onPress={() => setPage('profile')}
          style={{
            minHeight: parseFloat(theme.tokens['native-target-size']),
            justifyContent: 'center',
            maxWidth: '55%',
          }}
        >
          <ProfileIdentity
            email={account.session?.user.email ?? ''}
            role={business?.role ?? 'Account'}
          />
        </Pressable>
      )}
      <SidePanel
        title="Menu"
        wide={page === 'preferences'}
        menu={page === 'profile'}
        open={page !== null}
        onClose={() => setPage(null)}
      >
        {page === 'profile' && (
          <>
            <ProfileIdentity
              email={account.session?.user.email ?? ''}
              role={business?.role ?? 'Account'}
            />
            <Text tone="muted">{business?.name ?? 'No active business'}</Text>
            <MenuAction
              icon="⚙"
              label="Settings"
              onPress={() => {
                setPage(null);
                navigate('/settings/profile');
              }}
            />
            <MenuAction
              icon="user"
              label="Account settings"
              onPress={() => {
                setPage(null);
                navigate('/settings/profile');
              }}
            />
            <MenuAction icon="☷" label="Preferences" onPress={() => setPage('preferences')} />
            <MenuAction icon="☾" label="Theme" onPress={() => setPage('theme')} />
            <SettingSwitch
              label="Switch to offline register"
              value={false}
              description="Unlock a prepared register with a valid offline grant."
              onChange={() => setPage('offline')}
            />
            <MenuAction
              icon="↪"
              label="Sign out"
              disabled={account.busy}
              onPress={() => {
                setPage(null);
                void account.run(async () => {
                  lockOffline();
                  await authClient.logout();
                  return null;
                });
              }}
            />
          </>
        )}
        {page === 'theme' && (
          <>
            {(['light', 'dark', 'system'] as const).map((value) => (
              <Action
                key={value}
                variant={theme.preferences.appearance === value ? 'secondary' : 'ghost'}
                label={`${value[0]!.toUpperCase() + value.slice(1)}${theme.preferences.appearance === value ? ' ✓' : ''}`}
                disabled={theme.locked}
                onPress={() => theme.setAppearance(value)}
              />
            ))}
            <Text accessibilityRole="header">Accent color</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
              {(['default', 'teal', 'violet', 'rose', 'amber'] as const).map((color) => (
                <Pressable
                  key={color}
                  accessibilityRole="radio"
                  accessibilityLabel={color}
                  accessibilityState={{ checked: theme.preferences.accent === color }}
                  disabled={
                    settings.busy ||
                    !settings.snapshot ||
                    settings.snapshot.platform.values.enforced.accent !== undefined ||
                    settings.business?.values.enforced.accent !== undefined
                  }
                  onPress={() => void settingsModel.save({ accent: color })}
                  style={{
                    minHeight: parseFloat(theme.tokens['native-target-size']),
                    minWidth: parseFloat(theme.tokens['native-target-size']),
                    borderRadius: theme.controlRadius,
                    backgroundColor:
                      color === 'default' ? theme.tokens.info : theme.tokens[`primary-${color}`],
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: theme.colors.background }}>
                    {theme.preferences.accent === color ? '✓' : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        {page === 'preferences' && <SettingsPanel page preferencesOnly />}
        {page === 'offline' && (
          <>
            <Text>Locally saved sales remain pending until synchronization succeeds.</Text>
            <OfflinePanel allowSetup={false} />
          </>
        )}
      </SidePanel>
    </>
  );
}
function MenuAction({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.small }}>
      <NativeIcon name={icon} />
      <View style={{ flex: 1 }}>
        <Action label={label} variant="ghost" onPress={onPress} disabled={disabled} />
      </View>
    </View>
  );
}
