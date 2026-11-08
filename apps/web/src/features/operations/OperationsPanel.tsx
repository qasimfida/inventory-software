import { formatMinorUnits as originalAmount } from '@inventory/domain';
import { settingsModel } from '@/platform/settings';
import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { OperationsFilters } from './OperationsFilters';
import { StaffDetails } from './StaffDetails';
import { CostDetails } from './CostDetails';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  createOperationsClient,
  cancellableResource,
  staffForm,
  costForm,
} from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';

import { authClient } from '@/platform/auth-client';
import { useAppearance } from '@/theme/Appearance';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { SearchControl } from '@/components/common/SearchControl';
import { RecordCollection } from '@/components/common/RecordCollection';
import { Pagination } from '@/components/common/Pagination';
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
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

  useAppearance();
  const client = useMemo(
    () =>
      createOperationsClient(
        authClient.organizationRequest,
        () => crypto.randomUUID(),
        business.id,
      ),
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
      <div className="collection-search">
        <SearchControl label={`Search ${mode}`} value={search} onChange={setSearch} />
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Refresh records"
        disabled={state.busy}
        onClick={() => void model.run()}
      >
        <RefreshCw />
      </Button>
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
    <section className="screen-section" aria-label={mode === 'staff' ? 'Salaries' : 'Expenses'}>
      <ScreenHeader
        title={mode === 'staff' ? 'Salaries' : 'Expenses'}
        description="Track pay periods, business costs and payments made outside the POS till. Access roles are managed in Team and permissions. These records do not calculate payroll tax or withdraw cash from a register."
      />
      {state.error && <p role="alert">{state.error}</p>}
      {mode === 'staff' && (
        <>
          <RecordCollection
            toolbar={toolbar}
            actions={createAction}
            label="staff"
            columns={['Employee', 'Code / job title', 'Base salary']}
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
          <h3>Expenses and salary payments</h3>
          <RecordCollection
            toolbar={toolbar}
            actions={createAction}
            label="costs"
            columns={['Description', 'Reference / type', 'Outstanding']}
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
    </section>
  );
}
