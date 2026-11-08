import { formatMinorUnits as originalAmount } from '@inventory/domain';
import { settingsModel } from '../settings/model';
import { useDisplayMoney } from '../ui/useDisplayMoney';
import { OperationsFilters } from './OperationsFilters';
import { StaffDetails } from './StaffDetails';
import { CostDetails } from './CostDetails';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import {
  createOperationsClient,
  cancellableResource,
  staffForm,
  costForm,
} from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';

import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { IconAction } from '../ui/IconAction';
import { SearchControl } from '../ui/SearchControl';
import { RecordCollection } from '../ui/RecordCollection';
import { Pagination } from '../ui/Pagination';
import { CommandForm } from '../components/CommandForm';
export function OperationsPanel({
  business,
  locations,
  mode = 'expenses',
}: {
  business: Business;
  locations: Location[];
  mode?: 'staff' | 'expenses';
}) {
  const { formatMinorUnits } = useDisplayMoney();

  const theme = useTheme(),
    client = useMemo(
      () => createOperationsClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    );
  const [filters, setFilters] = useState<{
    storeId?: string | undefined;
    kind?: 'salary' | 'expense' | undefined;
    staffState?: 'active' | 'inactive' | undefined;
  }>({});
  const [search, setSearch] = useState(''),
    [query, setQuery] = useState(''),
    [offset, setOffset] = useState(0),
    [staffId, setStaffId] = useState<string>();
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const request = useMemo(
      () =>
        cancellableResource(
          (signal) => client.list(query, offset, signal, filters),
          () => new AbortController(),
        ),
      [client, query, offset, filters],
    ),
    model = request.model,
    state = useSyncExternalStore(model.subscribe, model.snapshot);
  useEffect(() => {
    void model.run();
    return () => {
      request.cancel();
      model.reset();
    };
  }, [model, request]);
  const [costId, setCostId] = useState<string>();
  const run = (work: () => Promise<unknown>) => void model.run(work);
  const selectedStaff = state.data?.staff.find((staff) => staff.id === staffId);
  const toolbar = (
    <>
      <View style={{ flexGrow: 1, flexBasis: 160 }}>
        <SearchControl label={`Search ${mode}`} value={search} onChange={setSearch} />
      </View>
      <IconAction
        icon="↻"
        label="Refresh records"
        disabled={state.busy}
        onPress={() => void model.run()}
      />
      <OperationsFilters
        mode={mode}
        locations={locations}
        value={filters}
        onChange={(next) => {
          setFilters(next);
          setOffset(0);
        }}
      />
    </>
  );
  const createAction = (
    <CommandForm
      definition={
        mode === 'staff'
          ? staffForm(client, locations, settingsModel.transactionCurrency())
          : costForm(client, locations, settingsModel.transactionCurrency())
      }
      run={run}
    />
  );

  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">{mode === 'staff' ? 'Salaries' : 'Expenses'}</Text>
      <Text tone="muted">
        Track pay periods, business costs and payments made outside the POS till. Access roles
        remain in Team and permissions. These records do not calculate payroll tax or withdraw
        register cash.
      </Text>

      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
      {mode === 'staff' && (
        <>
          <RecordCollection
            toolbar={toolbar}
            actions={createAction}
            label="staff"
            items={(state.data?.staff ?? []).map((s) => ({
              id: s.id,
              title: s.name,
              subtitle: `${s.code} · ${s.title}`,
              detail: formatMinorUnits(s.salaryMinor, s.currency),
              exportDetail: originalAmount(s.salaryMinor, s.currency),
              status: s.state,
              tone: s.state === 'active' ? 'success' : 'neutral',
            }))}
            onOpen={setStaffId}
          />
        </>
      )}
      {mode === 'expenses' && (
        <>
          <Text accessibilityRole="header">Expenses and salary payments</Text>
          <RecordCollection
            toolbar={toolbar}
            actions={createAction}
            label="costs"
            items={(state.data?.costs ?? []).map((c) => ({
              id: c.id,
              title: c.description,
              subtitle: `${c.reference} · ${c.kind} · ${c.actorName ?? c.actorId ?? 'Recorded user unavailable'}`,
              exportDetail: originalAmount(
                (BigInt(c.amountMinor) - BigInt(c.paidMinor)).toString(),
                c.currency,
              ),
              detail: formatMinorUnits(
                (BigInt(c.amountMinor) - BigInt(c.paidMinor)).toString(),
                c.currency,
              ),
              status: BigInt(c.paidMinor) === BigInt(c.amountMinor) ? 'Paid' : 'Outstanding',
              tone: BigInt(c.paidMinor) === BigInt(c.amountMinor) ? 'success' : 'warning',
            }))}
            onOpen={(id) => {
              const c = state.data?.costs.find((c) => c.id === id);
              if (c) setCostId(c.id);
            }}
          />
        </>
      )}
      <Pagination
        label={mode}
        offset={offset}
        pageSize={25}
        hasMore={
          !!state.data && (mode === 'staff' ? state.data.staffHasMore : state.data.costsHasMore)
        }
        busy={state.busy}
        onChange={setOffset}
      />
      {costId && (
        <CostDetails
          client={client}
          id={costId}
          onClose={() => setCostId(undefined)}
          onChange={() => void model.run()}
        />
      )}
      {selectedStaff && (
        <StaffDetails
          staff={selectedStaff}
          locations={locations}
          salaryDefinition={
            selectedStaff.state === 'active'
              ? costForm(client, locations, settingsModel.transactionCurrency(), selectedStaff)
              : undefined
          }
          definition={staffForm(
            client,
            locations,
            settingsModel.transactionCurrency(),
            selectedStaff,
          )}
          run={run}
          onClose={() => setStaffId(undefined)}
        />
      )}
    </View>
  );
}
