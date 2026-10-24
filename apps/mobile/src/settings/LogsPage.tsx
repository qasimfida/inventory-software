import { useEffect, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { hasPermission } from '@inventory/contracts';
import { settingsModel } from './model';
import { useWorkspace } from '../shell/WorkspaceContext';
import { SecurityPanel } from './SecurityPanel';
import { AuditHistory } from '../organization/AuditHistory';
import { Text } from '../ui/Themed';
import { CursorPagination } from '../ui/CursorPagination';
import { useTheme } from '../theme';
export function LogsPage() {
  const { business, model, state } = useWorkspace(),
    theme = useTheme();
  const settings = useSyncExternalStore(settingsModel.subscribe, settingsModel.snapshot);
  const allowed = !!business && hasPermission(business, 'audit.read');
  useEffect(() => {
    if (allowed) void model.audit();
  }, [allowed, business?.id, model]);
  if (!allowed && !settings.snapshot?.canManagePlatform)
    return <Text>Audit access is required.</Text>;
  return (
    <View style={{ gap: theme.spacing.medium }}>
      {settings.snapshot?.canManagePlatform && <SecurityPanel platform section="security" />}
      {allowed && (
        <>
          <Text accessibilityRole="header">Business activity</Text>

          {!!state.error && <Text accessibilityRole="alert">{state.error}</Text>}
          <AuditHistory
            onRefresh={() => void model.audit()}
            busy={state.busy}
            events={state.events}
            timeZone={business?.timeZone ?? 'UTC'}
          />
          {state.nextCursor && (
            <CursorPagination
              label="audit events"
              hasMore
              busy={state.busy}
              onNext={() => void model.audit(true)}
            />
          )}
        </>
      )}
    </View>
  );
}
