import { Link } from 'react-router-dom';
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
import { formatMinorUnits } from '@inventory/domain';
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
}: {
  business: Business;
  locations: Location[];
}) {
  const { preferences } = useAppearance();
  const client = useMemo(
    () =>
      createOperationsClient(
        authClient.organizationRequest,
        () => crypto.randomUUID(),
        business.id,
      ),
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
      <div className="collection-search">
        <SearchControl label="Search staff and expenses" value={search} onChange={setSearch} />
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Refresh staff and expenses"
        disabled={state.busy}
        onClick={() => void model.run()}
      >
        <RefreshCw />
      </Button>
    </>
  );
  return (
    <section className="screen-section" aria-label="Staff and expenses">
      <ScreenHeader
        title="Staff, salaries and expenses"
        description="Track pay periods, business costs and payments made outside the POS till. Access roles are managed in Team and permissions. These records do not calculate payroll tax or withdraw cash from a register."
      />
      {state.error && <p role="alert">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <CommandForm definition={staffForm(client, locations, preferences.currency)} run={run} />
        <CommandForm definition={costForm(client, locations, preferences.currency)} run={run} />
      </div>
      <Link className="text-primary underline" to="/team">
        Manage staff permissions and access
      </Link>
      <h3>Staff</h3>
      <RecordCollection
        toolbar={toolbar}
        label="staff"
        columns={['Employee', 'Code / job title', 'Base salary']}
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
            definition={costForm(client, locations, preferences.currency, s)}
            run={run}
          />
        ))}
      <h3>Salaries and expenses</h3>
      <RecordCollection
        label="costs"
        columns={['Description', 'Reference / type', 'Outstanding']}
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
          definition={staffForm(client, locations, preferences.currency, selectedStaff)}
          run={run}
          onClose={() => setStaffId(undefined)}
        />
      )}
    </section>
  );
}
