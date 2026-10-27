import { MetricCard } from '../ui/MetricCard';
import { IconAction } from '../ui/IconAction';
import { OnlineNotice } from './OnlineNotice';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { View, Pressable } from 'react-native';
import type { Business } from '@inventory/contracts';
import { hasPermission } from '@inventory/contracts';
import {
  createOnlineStoreClient,
  OnlineOverviewModel,
  onlineStoreStatusLabels,
  onlineAttentionLinks,
  onlineMessages,
  setupChecklist,
} from '@inventory/api-client';
import { authClient } from '../auth/client';
import { useCatalogLive } from '../platform/useCatalogLive';
import { useNavigation } from '../shell/Navigation';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { ErrorState, LoadingState } from '../ui/AsyncState';
import { useTheme } from '../theme';
export function OnlineOverview({ business, storeId }: { business: Business; storeId: string }) {
  const model = useMemo(
    () =>
      new OnlineOverviewModel(
        createOnlineStoreClient(authClient.organizationRequest, business.id, storeId),
        () => crypto.randomUUID(),
      ),
    [business.id, storeId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot),
    theme = useTheme(),
    { navigate } = useNavigation();
  useCatalogLive(business.id, () => void model.refresh());
  useEffect(() => {
    void model.refresh();
    const timer = setInterval(() => void model.refresh(), 15000);
    return () => {
      clearInterval(timer);
      model.reset();
    };
  }, [model]);
  const { overview, settings } = state;
  if (!overview || !settings)
    return state.error ? (
      <ErrorState message={state.error} onRetry={() => void model.refresh()} />
    ) : (
      <LoadingState message="Loading online store overview…" />
    );
  const steps = settings.settings ? setupChecklist(settings.settings, settings.prerequisites) : [];
  const incomplete = steps.filter((c) => !c.done);
  const counts = {
    changes: overview.counts.needs_changes,
    soldOut: overview.soldOut,
    warnings: overview.warnings,
  };
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">Online store overview</Text>
      <Text tone="muted">Publication health for this store.</Text>

      {state.error && <ErrorState message={state.error} onRetry={() => void model.refresh()} />}
      {!!state.error && <Text>Last loaded data is read-only until a successful refresh.</Text>}
      {!!state.message && <OnlineNotice key={state.message} message={state.message} />}
      <Text accessibilityRole="header">
        Store status: {onlineStoreStatusLabels[overview.status]}
      </Text>
      {overview.status === 'live' && <Text tone="muted">{onlineMessages.noPublicUrl}</Text>}
      <Text tone="muted">As of {new Date(overview.asOf).toLocaleString()}</Text>
      {(
        [
          ['Active', overview.counts.active + overview.counts.paused, 'active'],
          ['Changes required', overview.counts.needs_changes, 'changes-required'],
          ['Ready to publish', overview.counts.ready, 'ready'],
        ] as const
      ).map(([label, count, tab]) => (
        <Pressable
          key={tab}
          accessibilityRole="button"
          accessibilityLabel={`${label} (${count})`}
          onPress={() => navigate('/online-store/products?tab=' + tab)}
          style={{ minWidth: 0 }}
        >
          <MetricCard
            contained
            label={label}
            value={String(count)}
            unit="View products"
            primary={tab === 'active'}
            tone={tab === 'changes-required' ? 'warning' : 'success'}
          />
        </Pressable>
      ))}
      <Text accessibilityRole="header">Needs attention</Text>
      {onlineAttentionLinks
        .filter((item) => counts[item.key] > 0)
        .map((item) => (
          <Action
            key={item.key}
            label={`⚠ ${item.label} (${counts[item.key]}) ›`}
            onPress={() => navigate(item.path)}
          />
        ))}
      {(incomplete.length > 0 || !settings.settings) && (
        <IconAction
          label={`Store setup needs attention: ${incomplete.map((s) => s.label).join(', ') || 'Configure store in Settings'}`}
          icon="⚠"
          onPress={() =>
            navigate(
              incomplete[0]?.path === '/settings/company' &&
                !hasPermission(business, 'business.write')
                ? '/online-store/settings/general'
                : (incomplete[0]?.path ?? '/online-store/settings/general'),
            )
          }
        />
      )}
      {!Object.values(counts).some(Boolean) && !incomplete.length && settings.settings && (
        <Text accessibilityLiveRegion="polite">✓ All clear</Text>
      )}
      {!settings.settings && (
        <Pressable
          accessibilityRole="link"
          onPress={() => navigate('/online-store/settings/general')}
        >
          <Text style={{ textDecorationLine: 'underline' }}>Set up online store</Text>
        </Pressable>
      )}
      {incomplete.map((step) => (
        <Pressable
          key={step.label}
          accessibilityRole="link"
          disabled={step.path === '/settings/company' && !hasPermission(business, 'business.write')}
          onPress={() => navigate(step.path)}
          style={{ padding: theme.spacing.small }}
        >
          <Text style={{ textDecorationLine: 'underline' }}>
            {step.label}
            {step.path === '/settings/company' && !hasPermission(business, 'business.write')
              ? ' — ask an administrator'
              : ''}
          </Text>
        </Pressable>
      ))}
      {!Object.values(overview.counts).some(Boolean) &&
        hasPermission(business, 'onlineStore.manage') && (
          <Action label="Add products" onPress={() => navigate('/online-store/products/add')} />
        )}
      <Text>
        Last validated:{' '}
        {overview.lastValidatedAt
          ? new Date(overview.lastValidatedAt).toLocaleString()
          : 'Not validated yet'}
      </Text>
      <IconAction
        label="Refresh overview"
        icon="↻"
        disabled={state.busy}
        onPress={() => void model.refresh()}
      />
      {hasPermission(business, 'onlineStore.manage') && (
        <Action
          label="Re-check all"
          disabled={state.busy || !!state.error || !settings.settings}
          onPress={() => void model.recheck()}
        />
      )}
    </View>
  );
}
