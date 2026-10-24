import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { hasPermission } from '@inventory/contracts';
import type { Business } from '@inventory/contracts';
import { createDashboardClient, cancellableResource } from '@inventory/api-client';
import { IconAction } from '../ui/IconAction';
import { Choice, Action } from '../ui/Controls';
import { LoadingState, EmptyState } from '../ui/AsyncState';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { useTheme } from '../theme';
import { useNavigation } from '../shell/Navigation';
import { authClient } from '../auth/client';
import { DashboardMetrics, DashboardStock } from './DashboardStock';
import { DashboardSales } from './DashboardSales';
interface DashboardProps {
  business: Business;
  storeId?: string | undefined;
  warehouseIds?: string[] | undefined;
}
export function Dashboard(props: DashboardProps) {
  const { navigate } = useNavigation();
  const theme = useTheme();
  if (!hasPermission(props.business, 'reports.read'))
    return (
      <View style={{ gap: theme.spacing.medium }}>
        <ScreenHeader title="Your workspace is ready" />
        <Text>
          Open a section to begin. Only pages available to your role appear in navigation.
        </Text>
        <Action
          label="Start working"
          onPress={() =>
            navigate(hasPermission(props.business, 'sales.write') ? '/pos' : '/settings/profile')
          }
        />
      </View>
    );
  return <AuthorizedDashboard {...props} />;
}
function AuthorizedDashboard({ business, storeId, warehouseIds }: DashboardProps) {
  const theme = useTheme(),
    { navigate } = useNavigation(),
    [days, setDays] = useState<7 | 30>(30);
  const warehouseKey = warehouseIds?.join(',');
  const request = useMemo(() => {
    const client = createDashboardClient(authClient.organizationRequest, business.id);
    return cancellableResource(
      (signal) =>
        client.load(
          {
            currency: theme.preferences.currency,
            days,
            storeId,
            warehouseIds:
              warehouseKey === undefined ? undefined : warehouseKey.split(',').filter(Boolean),
          },
          signal,
        ),
      () => new AbortController(),
    );
  }, [business.id, theme.preferences.currency, days, storeId, warehouseKey]);
  const state = useSyncExternalStore(request.model.subscribe, request.model.snapshot);
  useEffect(() => {
    void request.model.run();
    return request.cancel;
  }, [request]);
  return (
    <View style={{ gap: theme.spacing.large }}>
      <ScreenHeader title="Welcome back" />
      <Text tone="muted">{business.name} · Confirmed activity in UTC</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.small }}>
        <Action
          label={`${theme.preferences.currency} · Currency settings`}
          variant="ghost"
          onPress={() => navigate('/settings/preferences')}
        />
        <IconAction
          label="Refresh dashboard"
          icon="↻"
          disabled={state.busy}
          onPress={() => void request.model.run()}
        />
      </View>
      <Choice
        label="Overview period"
        inline
        value={String(days)}
        options={[
          { value: '7', label: 'Last 7 days' },
          { value: '30', label: 'Last 30 days' },
        ]}
        onChange={(v) => setDays(v === '7' ? 7 : 30)}
      />
      {state.busy && <LoadingState message="Loading overview…" />}
      {Boolean(state.error) && (
        <>
          <Text accessibilityRole="alert">{state.error}</Text>
          <Action label="Retry overview" onPress={() => void request.model.run()} />
        </>
      )}
      {state.data && (
        <>
          <DashboardMetrics data={state.data} />
          {state.data.inventory && <DashboardStock inventory={state.data.inventory} />}
          {state.data.sales && <DashboardSales data={state.data} business={business} />}
          {!state.data.sales && !state.data.inventory && (
            <EmptyState message="Your role has no sales or stock report access." />
          )}
          <Text tone="muted">
            {state.data.from} – {state.data.to} UTC · {state.data.currency} only. Sales include tax
            and are before returns, not net profit. Stock covers your authorized warehouses.
          </Text>
        </>
      )}
    </View>
  );
}
