import { syncActivity } from '@inventory/api-client';
import { SidePanel } from '../ui/SidePanel';
import { Action } from '../ui/Controls';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import {
  createBusinessNotificationsClient,
  businessNotificationTitle,
  routeAllowed,
  workspaceRoutes,
} from '@inventory/api-client';
import { authClient } from '../auth/client';
import { IconAction } from '../ui/IconAction';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { useWorkspace } from './WorkspaceContext';
export function NativeStatus({ go }: { go: (path: string) => void }) {
  const activity = useSyncExternalStore(syncActivity.subscribe, syncActivity.snapshot);
  const { business } = useWorkspace(),
    theme = useTheme();
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    unread: string;
    reachable: boolean;
    notifications: Awaited<
      ReturnType<ReturnType<typeof createBusinessNotificationsClient>['inbox']>
    >['notifications'];
  }>({ id: '', unread: '', reachable: false, notifications: [] });
  useEffect(() => {
    if (!business) return;
    let cancelled = false;
    const client = createBusinessNotificationsClient(authClient.organizationRequest, business.id);
    const check = async () => {
      try {
        const page = await client.inbox();
        if (!cancelled)
          setResult({
            id: business.id,
            unread:
              String(page.notifications.filter((n) => !n.readAt).length) +
              (page.nextCursor ? '+' : ''),
            reachable: true,
            notifications: page.notifications,
          });
      } catch {
        if (!cancelled)
          setResult({ id: business.id, unread: '', reachable: false, notifications: [] });
      }
    };
    void check();
    const timer = setInterval(() => void check(), 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [business]);
  if (!business) return null;
  const ready = result.id === business.id,
    device = workspaceRoutes.find((r) => r.path === '/settings/device')!;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: theme.spacing.small,
        paddingHorizontal: theme.spacing.medium,
      }}
    >
      <SidePanel title="Notifications" open={open} onClose={() => setOpen(false)} menu>
        {activity && (
          <View>
            <Text accessibilityLiveRegion="polite">
              Local synchronization · {activity.progress.phase} · {activity.progress.confirmed} of{' '}
              {activity.progress.total} records confirmed
            </Text>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Server-confirmed records"
              accessibilityValue={
                activity.progress.total
                  ? { min: 0, max: activity.progress.total, now: activity.progress.confirmed }
                  : undefined
              }
              style={{ height: theme.spacing.small, backgroundColor: theme.tokens.muted }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${activity.progress.total ? (100 * activity.progress.confirmed) / activity.progress.total : 0}%`,
                  backgroundColor: theme.tokens.primary,
                }}
              />
            </View>
            <Action
              label="View synchronization result"
              onPress={() => {
                setOpen(false);
                activity.inspect();
              }}
            />
          </View>
        )}
        {!ready || !result.reachable ? (
          <Text>Recent notifications are unavailable.</Text>
        ) : !result.notifications.length ? (
          <Text>No recent notifications.</Text>
        ) : (
          result.notifications.slice(0, 5).map((n) => (
            <View key={n.id} style={{ paddingVertical: theme.spacing.small }}>
              <Text style={{ fontWeight: '600' }}>{businessNotificationTitle(n.event)}</Text>
              <Text>
                {new Date(n.createdAt).toLocaleString()}
                {!n.readAt ? ' · Unread' : ''}
              </Text>
            </View>
          ))
        )}
        <Action
          label="View all notifications"
          onPress={() => {
            setOpen(false);
            go('/notifications');
          }}
        />
      </SidePanel>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconAction
          label={ready && result.reachable ? 'Online · device status' : 'Offline · device status'}
          disabled={!routeAllowed(device, business)}
          icon="cloud"
          onPress={() => go('/settings/device')}
        />
        <View
          accessible={false}
          style={{
            width: theme.spacing.small,
            height: theme.spacing.small,
            borderRadius: theme.radius,
            backgroundColor:
              ready && result.reachable ? theme.tokens.success : theme.tokens.destructive,
          }}
        />
      </View>
      <View
        accessible={false}
        style={{
          width: parseFloat(theme.tokens['border-width']),
          height: theme.spacing.medium,
          backgroundColor: theme.tokens.border,
        }}
      />
      <View>
        <IconAction
          label={`Notifications${ready && result.unread ? `, ${result.unread} unread` : ''}`}
          icon="bell"
          onPress={() => setOpen(true)}
        />
        {ready && result.unread !== '0' && Boolean(result.unread) && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              borderRadius: theme.radius,
              backgroundColor: theme.colors.primary,
              paddingHorizontal: theme.spacing.small,
            }}
            pointerEvents="none"
          >
            <Text style={{ color: theme.colors.onPrimary }}>{result.unread}</Text>
          </View>
        )}
      </View>
      <View
        accessible={false}
        style={{
          width: parseFloat(theme.tokens['border-width']),
          height: theme.spacing.medium,
          backgroundColor: theme.tokens.border,
        }}
      />
      <IconAction
        label={theme.mode === 'dark' ? 'Use light theme' : 'Use dark theme'}
        icon={theme.mode === 'dark' ? '☀' : '☾'}
        disabled={theme.locked}
        onPress={() => theme.setAppearance(theme.mode === 'dark' ? 'light' : 'dark')}
      />
    </View>
  );
}
