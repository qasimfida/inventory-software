import { WarehouseSelect } from '../ui/WarehouseSelect';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { EmptyState, LoadingState } from '../ui/AsyncState';
import { ScreenBody } from '../ui/ScreenHeader';
import { MetricCard } from '../ui/MetricCard';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { DataRow } from '../ui/DataRow';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import {
  availableReports,
  createReportsClient,
  defaultReportDates,
  ResourceModel,
} from '@inventory/api-client';
import type { Business, Location, ReportQuery } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { Action, Field, Choice } from '../ui/Controls';
import { Text } from '../ui/Themed';
export function ReportsPanel({
  business,
  locations,
  page = false,
}: {
  business: Business;
  locations: Location[];
  page?: boolean;
}) {
  const sections = availableReports(business),
    [query, setQuery] = useState<ReportQuery>({
      ...defaultReportDates(),
      section: sections[0]?.value ?? 'inventory',
      offset: 0,
      lowOnly: 'false',
    });
  const [draft, setDraft] = useState(query),
    [open, setOpen] = useState(page);
  const client = useMemo(
    () => createReportsClient(authClient.organizationRequest, business.id),
    [business.id],
  );
  const model = useMemo(() => new ResourceModel(() => client.load(query)), [client, query]);
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
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
    if (open && sections.length) void model.run();
    return model.reset;
  }, [model, open, sections.length]);
  return (
    <ScreenBody>
      <DisclosureTrigger
        expanded={open}
        label="Reports and dashboard"
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Text>
            Confirmed server data. Dates use YYYY-MM-DD, inclusive UTC days, at most 366 days.
          </Text>
          {!sections.length ? (
            <EmptyState message="No report categories available." />
          ) : (
            <>
              <Choice
                label="Report"
                value={draft.section}
                options={sections}
                onChange={(value) =>
                  setDraft({ ...draft, section: value as ReportQuery['section'] })
                }
              />
              <WarehouseSelect
                label="Report warehouse"
                value={draft.warehouseId ?? ''}
                options={[
                  { value: '', label: 'All in your scope' },
                  ...locations
                    .filter((l) => l.kind === 'warehouses')
                    .map((l) => ({ value: l.id, label: l.name })),
                ]}
                onChange={(value) => setDraft({ ...draft, warehouseId: value || undefined })}
              />
              <Field
                label="From (UTC)"
                value={draft.from}
                onChange={(from) => setDraft({ ...draft, from })}
              />
              <Field
                label="Through (UTC)"
                value={draft.to}
                onChange={(to) => setDraft({ ...draft, to })}
              />
              {draft.section === 'inventory' && (
                <Choice
                  label="Stock filter"
                  value={draft.lowOnly}
                  options={[
                    { value: 'false', label: 'All recorded stock' },
                    { value: 'true', label: 'Low stock only' },
                  ]}
                  onChange={(value) => setDraft({ ...draft, lowOnly: value as 'true' | 'false' })}
                />
              )}
              <Action
                label="Run report"
                disabled={state.busy}
                onPress={() => setQuery({ ...draft, offset: 0 })}
              />
            </>
          )}
          {state.busy && <LoadingState message="Loading report…" />}
          {!!state.error && (
            <>
              <Text accessibilityRole="alert">{state.error}</Text>
              <Action label="Retry report" onPress={() => void model.run()} />
            </>
          )}
          {state.data && (
            <>
              <Text>
                Generated {state.data.asOf} · {state.data.from} through {state.data.to} UTC
              </Text>
              {!state.data.rows.length && (
                <EmptyState message="No matching records for this report." />
              )}
              {query.section !== 'inventory' && query.section !== 'movements' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                  {state.data.rows.slice(0, 4).map((row, index) => (
                    <MetricCard
                      key={row.key}
                      label={row.label}
                      value={row.value}
                      unit={row.unit}
                      primary={index === 0}
                    />
                  ))}
                </View>
              )}
              {state.data.rows.map((row) => (
                <DataRow key={row.key} label={row.label} value={row.value} unit={row.unit} />
              ))}
              <Pagination
                label="report rows"
                offset={query.offset}
                pageSize={50}
                hasMore={state.data.hasMore}
                busy={state.busy || Boolean(state.error)}
                onChange={(offset) => setQuery({ ...query, offset })}
              />
              {state.data.notes.map((note) => (
                <Text key={note}>{note}</Text>
              ))}
            </>
          )}
        </>
      )}
    </ScreenBody>
  );
}
