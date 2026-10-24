import { syncActivity } from '@inventory/api-client';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import type { OfflineWorkspace } from '@inventory/api-client';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { SidePanel } from '../ui/SidePanel';
import { useTheme } from '../theme';
export function SyncStatus({ state }: { state: ReturnType<OfflineWorkspace['snapshot']> }) {
  const [open, setOpen] = useState(false),
    theme = useTheme(),
    sync = state.sync;
  useEffect(() => (sync ? syncActivity.publish(sync, () => setOpen(true)) : undefined), [sync]);
  const [dismissed, setDismissed] = useState<typeof sync>(undefined);
  const notice =
    sync &&
    sync !== dismissed &&
    sync.total > 0 &&
    (sync.phase === 'complete' || sync.phase === 'attention')
      ? sync.phase === 'complete'
        ? `Sync complete: ${sync.confirmed} records confirmed by the server.`
        : `Sync needs attention: ${sync.remaining} records still await confirmation.`
      : '';
  if (!sync) return null;
  const running = sync.phase === 'uploading' || sync.phase === 'downloading';
  return (
    <View
      style={{
        padding: theme.spacing.medium,
        backgroundColor: theme.tokens.card,
        gap: theme.spacing.small,
      }}
    >
      {Boolean(notice) && (
        <View
          style={{
            backgroundColor: theme.tokens.accent,
            padding: theme.spacing.medium,
            borderRadius: theme.radius,
          }}
        >
          <Text accessibilityLiveRegion="polite">{notice}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <Action label="View result" onPress={() => setOpen(true)} />
            <Action label="Dismiss" variant="ghost" onPress={() => setDismissed(sync)} />
          </View>
        </View>
      )}
      <Text accessibilityRole="header">Synchronization activity</Text>
      <Text accessibilityLiveRegion="polite">
        {running
          ? 'Synchronizing'
          : sync.phase === 'complete'
            ? 'Synchronization complete'
            : 'Synchronization needs attention'}{' '}
        · {sync.confirmed} of {sync.total} pending records confirmed
      </Text>
      {running && (
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Server-confirmed records"
          accessibilityValue={
            sync.total ? { min: 0, max: sync.total, now: sync.confirmed } : undefined
          }
          style={{ height: theme.spacing.small, backgroundColor: theme.tokens.muted }}
        >
          <View
            style={{
              height: '100%',
              width: `${sync.total ? (100 * sync.confirmed) / sync.total : 0}%`,
              backgroundColor: theme.tokens.primary,
            }}
          />
        </View>
      )}
      <Action variant="ghost" label="View synchronization details" onPress={() => setOpen(true)} />
      <SidePanel title="Synchronization details" open={open} onClose={() => setOpen(false)}>
        {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
        {state.data?.outbox.map((e) => (
          <View key={e.operation.id}>
            <Text>
              {e.state} · {e.operation.id}
            </Text>
            <Text>
              {e.result?.saleId ? `Confirmed sale: ${e.result.saleId}` : 'No confirmed sale yet'}
            </Text>
            <Text>{e.error}</Text>
          </View>
        ))}
        {!state.data?.outbox.length && <Text>No locally recorded sales.</Text>}
      </SidePanel>
    </View>
  );
}
