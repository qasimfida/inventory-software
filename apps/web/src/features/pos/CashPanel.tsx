import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createCashClient, cashForms, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';

import { CommandForm } from '@/components/common/CommandForm';
import { authClient } from '@/platform/auth-client';

const operationKey = () => crypto.randomUUID();
export function CashPanel({
  business,
  warehouseId,
  locations,
}: {
  business: Business;
  warehouseId: string;
  locations: Location[];
}) {
  const [offset, setOffset] = useState(0),
    client = useMemo(
      () => createCashClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    );
  const model = useMemo(
      () => new ResourceModel(() => client.list(warehouseId, offset)),
      [client, warehouseId, offset],
    ),
    state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <section aria-label="Cash shifts">
      <h2>Cash shifts</h2>
      <p>
        Cash only. Open a shift before collecting cash. Confirm money received before recording.
        Closed shifts are immutable.
      </p>
      {state.error && <p role="alert">{state.error}</p>}
      <Button onClick={() => void model.run()} disabled={state.busy}>
        Refresh cash shifts
      </Button>
      {state.data?.shifts.map((s) => (
        <p key={s.id}>
          Shift {s.id} · {s.state} · {s.currency} minor units · expected {s.expectedMinor} · counted{' '}
          {s.countedMinor ?? '—'} · discrepancy {s.discrepancyMinor ?? '—'}
        </p>
      ))}
      <Button onClick={() => setOffset(Math.max(0, offset - 25))} disabled={!offset}>
        Previous shifts
      </Button>
      <Button onClick={() => setOffset(offset + 25)} disabled={!state.data?.hasMore}>
        Next shifts
      </Button>
      {state.data &&
        cashForms(client, business, warehouseId, locations, state.data.shifts).map((f) => (
          <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
        ))}
    </section>
  );
}
