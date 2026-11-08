import type { createIntegrationsClient } from '@inventory/api-client';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/common/AsyncState';
type Status = Awaited<ReturnType<ReturnType<typeof createIntegrationsClient>['load']>>;
const names = { payments: 'Payments', notifications: 'Notifications', ai: 'Navigation assistant' };
const states = { local: 'Built-in only', unconfigured: 'Not configured', enabled: 'Enabled' };
/** Server-reported capability, not a connection test or provider activation control. */
export function ProviderOverview({ data }: { data: Status }) {
  return (
    <div className="space-y-5">
      <section aria-label="Provider status" className="space-y-3">
        <h2>Provider status</h2>
        <p className="text-sm text-muted-foreground">
          These are reported capabilities, not live connection tests. Provider setup is managed by
          your deployment operator.
        </p>
        {!data.services.length ? (
          <EmptyState
            message="No provider status returned"
            description="Refresh the status or contact your deployment operator. No provider is assumed to be enabled."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.services.map((service) => (
              <section
                key={service.id}
                aria-label={names[service.id]}
                className="min-w-0 space-y-3 rounded-lg border bg-card p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3>{names[service.id]}</h3>
                  <StatusBadge
                    tone={
                      service.state === 'unconfigured'
                        ? 'warning'
                        : service.state === 'enabled'
                          ? 'success'
                          : 'neutral'
                    }
                  >
                    {states[service.state]}
                  </StatusBadge>
                </div>
                <p className="text-sm text-muted-foreground">{service.detail}</p>
              </section>
            ))}
          </div>
        )}
      </section>
      <section aria-label="Available workspace sections" className="space-y-2">
        <h2>Available workspace sections</h2>
        <p className="text-sm text-muted-foreground">
          Navigation guidance for your current permissions. Use the workspace menu to open a
          section.
        </p>
        {data.navigation.length ? (
          <ul className="grid list-disc gap-2 pl-5 sm:grid-cols-2">
            {data.navigation.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        ) : (
          <EmptyState
            message="No navigation guidance available"
            description="An administrator can review your workspace access."
          />
        )}
      </section>
    </div>
  );
}
