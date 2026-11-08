import { View } from 'react-native';
import type { createIntegrationsClient } from '@inventory/api-client';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { StatusBadge } from '../ui/StatusBadge';
import { EmptyState } from '../ui/AsyncState';
type Status = Awaited<ReturnType<ReturnType<typeof createIntegrationsClient>['load']>>;
const names = { payments: 'Payments', notifications: 'Notifications', ai: 'Navigation assistant' };
const states = { local: 'Built-in only', unconfigured: 'Not configured', enabled: 'Enabled' };
/** Server-reported capability, not a connection test or provider activation control. */
export function ProviderOverview({ data }: { data: Status }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.large }}>
      <View accessibilityLabel="Provider status" style={{ gap: theme.spacing.medium }}>
        <Text accessibilityRole="header">Provider status</Text>
        <Text tone="muted">
          These are reported capabilities, not live connection tests. Provider setup is managed by
          your deployment operator.
        </Text>
        {!data.services.length ? (
          <EmptyState
            message="No provider status returned"
            description="Refresh the status or contact your deployment operator. No provider is assumed to be enabled."
          />
        ) : (
          data.services.map((service) => (
            <View
              key={service.id}
              accessibilityLabel={names[service.id]}
              style={{
                gap: theme.spacing.small,
                padding: theme.spacing.medium,
                borderWidth: 1,
                borderColor: theme.tokens.border,
                borderRadius: theme.radius,
                backgroundColor: theme.tokens.card,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: theme.spacing.small,
                }}
              >
                <Text accessibilityRole="header">{names[service.id]}</Text>
                <StatusBadge
                  tone={
                    service.state === 'unconfigured'
                      ? 'warning'
                      : service.state === 'enabled'
                        ? 'success'
                        : 'neutral'
                  }
                  label={states[service.state]}
                />
              </View>
              <Text tone="muted">{service.detail}</Text>
            </View>
          ))
        )}
      </View>
      <View accessibilityLabel="Available workspace sections" style={{ gap: theme.spacing.small }}>
        <Text accessibilityRole="header">Available workspace sections</Text>
        <Text tone="muted">
          Navigation guidance for your current permissions. Use the workspace menu to open a
          section.
        </Text>
        {data.navigation.length ? (
          data.navigation.map((label) => <Text key={label}>{label}</Text>)
        ) : (
          <EmptyState
            message="No navigation guidance available"
            description="An administrator can review your workspace access."
          />
        )}
      </View>
    </View>
  );
}
