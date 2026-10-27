import { useState, useSyncExternalStore } from 'react';
import { View, Pressable } from 'react-native';
import { useWorkspace } from './WorkspaceContext';
import { useNavigation } from './Navigation';
import { settingsModel } from '../settings/model';
import { SidePanel } from '../ui/SidePanel';
import { canSwitchWorkspace } from '@inventory/api-client';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { ProfileIdentity } from './ProfileIdentity';
import { useTheme } from '../theme';
export function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false),
    { navigate } = useNavigation(),
    theme = useTheme();
  const { business, state, model, storeId, setStoreId, selection, setSelection, locked } =
    useWorkspace();
  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const canSwitch = canSwitchWorkspace(business, settings.snapshot?.canManagePlatform ?? false);
  const stores =
    state.workspace?.locations.filter((l) => l.kind !== 'terminals' && l.state === 'active') ?? [];
  function view(id: string, path = '/dashboard') {
    if (locked) return;
    setStoreId(id);
    setOpen(false);
    navigate(path, true);
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Switch workspace"
        accessibilityState={{ disabled: !canSwitch }}
        disabled={!canSwitch}
        onPress={() => setOpen(true)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.small,
          padding: theme.spacing.small,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <ProfileIdentity
            email=""
            displayName={business?.name ?? 'Choose a business'}
            role={business?.role ?? 'Account'}
            logo={
              settings.businessId === business?.id
                ? (settings.business?.values.company?.logo ?? '')
                : ''
            }
          />
        </View>
        {canSwitch && <Text accessible={false}>⌄</Text>}
      </Pressable>
      <SidePanel title="Switch workspace" open={open} onClose={() => setOpen(false)}>
        <View style={{ gap: theme.spacing.medium }}>
          <ProfileIdentity
            email=""
            displayName={business?.name ?? 'Choose a business'}
            role={business?.role ?? 'Account'}
            logo={
              settings.businessId === business?.id
                ? (settings.business?.values.company?.logo ?? '')
                : ''
            }
          />
          {locked && (
            <Text accessibilityRole="alert">
              Finish or clear the cart before switching. Reconcile any unresolved checkout first.
            </Text>
          )}
          <Text accessibilityRole="header">Businesses</Text>
          {state.businesses.map((b) => (
            <Action
              key={b.id}
              label={`${b.name} · ${b.role}${b.id === business?.id && !storeId ? ' · selected' : ''}`}
              disabled={locked || state.busy || b.state !== 'active'}
              onPress={() => {
                if (b.id === business?.id) view('');
                else
                  void model.select(b.id).then(() => {
                    if (model.snapshot().selectedId === b.id) view('');
                  });
              }}
            />
          ))}
          <Text accessibilityRole="header">Stores & warehouses</Text>
          <Action
            label="All authorized locations"
            disabled={locked || state.busy}
            onPress={() => view('')}
          />
          {stores.map((s) => (
            <Action
              key={s.id}
              label={`${s.name} · ${s.kind}${selection.includes(s.id) ? ' · selected' : ''}`}
              disabled={locked || state.busy}
              onPress={() => {
                setSelection([s.id]);
                setOpen(false);
                navigate('/dashboard', true);
              }}
            />
          ))}
          {settings.snapshot?.canManagePlatform && (
            <Action
              label="Platform overview"
              disabled={locked}
              onPress={() => view('', '/admin')}
            />
          )}
          {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
        </View>
      </SidePanel>
    </>
  );
}
