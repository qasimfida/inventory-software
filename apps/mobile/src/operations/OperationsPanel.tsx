import { useNavigation } from '../shell/Navigation';
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
import { formatMinorUnits } from '@inventory/domain';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { useTheme } from '../theme';
import { Text } from '../ui/Themed';
import { Action } from '../ui/Controls';
import { IconAction } from '../ui/IconAction';
import { SearchControl } from '../ui/SearchControl';
import { RecordCollection } from '../ui/RecordCollection';
import { Pagination } from '../ui/Pagination';
import { CommandForm } from '../components/CommandForm';
export function OperationsPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const { navigate } = useNavigation();
  const theme = useTheme(),
    client = useMemo(
      () => createOperationsClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    );
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
          (signal) => client.list(query, offset, signal),
          () => new AbortController(),
        ),
      [client, query, offset],
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
        <SearchControl label="Search staff and expenses" value={search} onChange={setSearch} />
      </View>
      <IconAction
        icon="↻"
        label="Refresh staff and expenses"
        disabled={state.busy}
        onPress={() => void model.run()}
      />
    </>
  );
  return (
    <View style={{ gap: theme.spacing.medium }}>
      <Text accessibilityRole="header">Staff, salaries and expenses</Text>
      <Text tone="muted">
        Track pay periods, business costs and payments made outside the POS till. Access roles
        remain in Team and permissions. These records do not calculate payroll tax or withdraw
        register cash.
      </Text>

      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
      <CommandForm
        definition={staffForm(client, locations, theme.preferences.currency)}
        run={run}
      />
      <CommandForm definition={costForm(client, locations, theme.preferences.currency)} run={run} />
      <Action label="Manage staff permissions and access" onPress={() => navigate('/team')} />
      <Text accessibilityRole="header">Staff</Text>
      <RecordCollection
        toolbar={toolbar}
        label="staff"
        items={(state.data?.staff ?? []).map((s) => ({
          id: s.id,
          title: s.name,
          subtitle: `${s.code} · ${s.title}`,
          detail: formatMinorUnits(s.salaryMinor, s.currency),
          status: s.state,
          tone: s.state === 'active' ? 'success' : 'neutral',
        }))}
        onOpen={setStaffId}
      />
      {state.data?.staff
        .filter((s) => s.state === 'active')
        .map((s) => (
          <CommandForm
            key={s.id}
            definition={costForm(client, locations, theme.preferences.currency, s)}
            run={run}
          />
        ))}
      <Text accessibilityRole="header">Salaries and expenses</Text>
      <RecordCollection
        label="costs"
        items={(state.data?.costs ?? []).map((c) => ({
          id: c.id,
          title: c.description,
          subtitle: `${c.reference} · ${c.kind}`,
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
      <Pagination
        label="staff and expenses"
        offset={offset}
        pageSize={25}
        hasMore={!!state.data && (state.data.staffHasMore || state.data.costsHasMore)}
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
          definition={staffForm(client, locations, theme.preferences.currency, selectedStaff)}
          run={run}
          onClose={() => setStaffId(undefined)}
        />
      )}
    </View>
  );
}
