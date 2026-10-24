import { AccordionSection } from '@/components/ui/Accordion';
import { EmptyState, LoadingState } from '@/components/common/AsyncState';
import { Dashboard } from '../reports/Dashboard';
import { panels } from './workflow-panels';
import { workflowIcons } from './workflow-icons';
import { Suspense, useState } from 'react';
import type { ReactNode } from 'react';
import { SectionNavigation } from '@/components/layout/SectionNavigation';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
export function ManagementWorkflows({
  business,
  locations,
  administration,
}: {
  business: Business;
  locations: Location[] | null;
  administration: ReactNode;
}) {
  const [page, setPage] = useState('overview');
  const [visited, setVisited] = useState<string[]>([]);
  const available =
    business.state === 'active'
      ? panels.filter((p) =>
          p.permissions.every((permission) => hasPermission(business, permission)),
        )
      : [];
  const current =
    page === 'administration' || available.some((p) => p.name === page) ? page : 'overview';
  function navigate(name: string) {
    setPage(name);
    setVisited((previous) => (previous.includes(name) ? previous : [...previous, name]));
  }
  const links = [
    { name: 'overview', label: 'Overview' },
    ...available,
    { name: 'administration', label: 'Business & access' },
  ];
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[72px_minmax(0,1fr)]">
      <SectionNavigation
        items={links.map((item) => ({ ...item, Icon: workflowIcons[item.name] }))}
        current={current}
        onSelect={navigate}
        sticky
        rail
      />
      <div className="workspace-content min-w-0 bg-card p-4 sm:p-6">
        {current === 'overview' && (
          <section aria-label="Workspace overview" className="space-y-5">
            <div>
              <h3>Welcome to {business.name}</h3>
              <p className="text-sm text-muted-foreground">
                Your role: {business.role.replaceAll('_', ' ')} · {business.state}
              </p>
            </div>
            {business.state === 'active' && hasPermission(business, 'reports.read') && (
              <Dashboard business={business} />
            )}
            <p>
              Choose a section to start working. Changes to stock and payments are verified by the
              server.
            </p>
            {locations && (
              <p className="text-sm">
                {locations.filter((l) => l.kind === 'stores').length} stores ·{' '}
                {locations.filter((l) => l.kind === 'warehouses').length} warehouses ·{' '}
                {locations.filter((l) => l.kind === 'terminals').length} terminals in your scope
              </p>
            )}
            {locations?.length === 0 && (
              <p>
                Add your stores, warehouses and terminals in Business &amp; access to prepare this
                business for transactions.
              </p>
            )}
            {available.filter((p) => !['notifications', 'integrations'].includes(p.name)).length ===
              0 && (
              <EmptyState message="No transaction sections are available for your current access. An owner can assign permissions in Business &amp; access." />
            )}
            <AccordionSection title={<>All workspace sections</>}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {available.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() => navigate(item.name)}
                    className="rounded-lg border bg-card p-5 text-left hover:bg-muted"
                  >
                    <span className="block font-semibold">{item.label}</span>
                    <span className="text-sm text-muted-foreground">{item.description}</span>
                  </button>
                ))}
              </div>
            </AccordionSection>
          </section>
        )}
        <div hidden={current !== 'administration'}>{administration}</div>
        {locations &&
          available
            .filter((p) => visited.includes(p.name))
            .map(({ Component, name }) => (
              <div key={name} hidden={current !== name}>
                <Suspense fallback={<LoadingState message="Loading workspace…" />}>
                  <Component
                    key={JSON.stringify(
                      name === 'warehouse' ? [name, business] : [name, business, locations],
                    )}
                    business={business}
                    locations={locations}
                  />
                </Suspense>
              </div>
            ))}
      </div>
    </div>
  );
}
