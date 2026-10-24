import { RegistrationTrend } from './RegistrationTrend';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { createSecurityClient, ResourceModel } from '@inventory/api-client';
import { authClient } from '../auth/client';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { MetricCard } from '../ui/MetricCard';
import { useNavigation } from '../shell/Navigation';
import { Action } from '../ui/Controls';
import { LoadingState } from '../ui/AsyncState';
export function PlatformOverview() {
  const theme = useTheme(),
    { navigate } = useNavigation();
  const model = useMemo(
    () => new ResourceModel(() => createSecurityClient(authClient.accountRequest).overview()),
    [],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    const timer = setTimeout(() => void model.run(), 250);
    return () => {
      clearTimeout(timer);
      model.reset();
    };
  }, [model]);
  const data = state.data;
  return (
    <View style={{ gap: theme.spacing.large }}>
      <Text tone="muted">Administrative registrations. Access is verified by the server.</Text>
      {state.busy && <LoadingState message="Loading platform analytics…" />}
      {!!state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      <Action
        label="Refresh platform overview"
        variant="ghost"
        disabled={state.busy}
        onPress={() => void model.run()}
      />
      {data && (
        <>
          <View style={{ gap: theme.spacing.medium }}>
            <MetricCard
              label="Businesses"
              value={data.totals.businesses}
              unit={`${data.totals.activeBusinesses} active`}
              primary
            />
            <MetricCard
              tone="success"
              label="Accounts"
              value={data.totals.accounts}
              unit="Registered accounts"
            />
            <MetricCard
              tone="warning"
              label="Stores"
              value={data.totals.stores}
              unit="Registered stores"
            />
            <MetricCard
              tone="destructive"
              label="Warehouses"
              value={data.totals.warehouses}
              unit={`${data.totals.terminals} terminals`}
            />
          </View>
          <RegistrationTrend rows={data.registrations} />
          <Action
            label="View administrative logs"
            variant="ghost"
            onPress={() => navigate('/logs')}
          />
          <Action label="↗ View all businesses" onPress={() => navigate('/admin/businesses')} />
        </>
      )}
    </View>
  );
}
