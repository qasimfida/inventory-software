import { ReportResults } from './ReportResults';
import './reports-print.css';
import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useId, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  availableReports,
  createReportsClient,
  defaultReportDates,
  ResourceModel,
} from '@inventory/api-client';
import type { Business, Location, ReportQuery } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { EmptyState, LoadingState, ErrorState } from '@/components/common/AsyncState';
export function ReportsPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const id = useId();
  const sections = availableReports(business),
    [query, setQuery] = useState<ReportQuery>({
      ...defaultReportDates(),
      section: sections[0]?.value ?? 'inventory',
      offset: 0,
      lowOnly: 'false',
    });
  const [draft, setDraft] = useState(query);
  const client = useMemo(
    () => createReportsClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const model = useMemo(() => new ResourceModel(() => client.load(query)), [client, query]);
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, { ...query, offset: undefined }],
    query.offset,
    ['rows'],
    () => {
      setQuery((previous) => ({ ...previous, offset: 0 }));
    },
  );
  useEffect(() => {
    if (sections.length) void model.run();
    return model.reset;
  }, [model, sections.length]);
  if (!sections.length)
    return <EmptyState message="No report categories are available with your permissions." />;
  return (
    <section aria-label="Reports and dashboard" className="screen-section reports-workspace">
      <ScreenHeader
        title="Reports"
        description={
          <>
            Confirmed server data. Period flows use inclusive UTC dates, up to 366 days. Inventory
            and outstanding balances are current, regardless of the date range.
          </>
        }
      />
      <form
        className="report-filters grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery({ ...draft, offset: 0 });
        }}
      >
        <label htmlFor={`${id}-section`}>
          Report
          <Select
            aria-label="Report"
            id={`${id}-section`}
            value={draft.section}
            onChange={(e) =>
              setDraft({ ...draft, section: e.target.value as ReportQuery['section'] })
            }
          >
            {sections.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <WarehouseSelect
          label="Warehouse"
          aria-label="Warehouse"
          id={`${id}-warehouse`}
          value={draft.warehouseId ?? ''}
          onChange={(e) => setDraft({ ...draft, warehouseId: e.target.value || undefined })}
        >
          <option value="">All warehouses in your scope</option>
          {locations
            .filter((l) => l.kind === 'warehouses')
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </WarehouseSelect>
        <label htmlFor={`${id}-from`}>
          From (UTC)
          <Input
            id={`${id}-from`}
            type="date"
            required
            value={draft.from}
            onChange={(e) => setDraft({ ...draft, from: e.target.value })}
          />
        </label>
        <label htmlFor={`${id}-to`}>
          Through (UTC)
          <Input
            id={`${id}-to`}
            type="date"
            required
            value={draft.to}
            onChange={(e) => setDraft({ ...draft, to: e.target.value })}
          />
        </label>
        {draft.section === 'inventory' && (
          <label htmlFor={`${id}-low`}>
            Stock filter
            <Select
              aria-label="Stock filter"
              id={`${id}-low`}
              value={draft.lowOnly}
              onChange={(e) => setDraft({ ...draft, lowOnly: e.target.value as 'true' | 'false' })}
            >
              <option value="false">All recorded stock</option>
              <option value="true">Low stock only</option>
            </Select>
          </label>
        )}
        <Button type="submit" disabled={state.busy}>
          Run report
        </Button>
      </form>
      {state.busy && <LoadingState message="Loading report…" />}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {state.data && (
        <>
          <ReportResults data={state.data} />
          <div className="flex flex-wrap gap-2">
            <Pagination
              label="report rows"
              offset={query.offset}
              pageSize={50}
              hasMore={state.data.hasMore}
              busy={state.busy || Boolean(state.error)}
              onChange={(offset) => setQuery({ ...query, offset })}
            />
          </div>
        </>
      )}
    </section>
  );
}
