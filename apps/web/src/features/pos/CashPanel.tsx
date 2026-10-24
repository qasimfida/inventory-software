import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { RecordDetails } from '@/components/common/RecordDetails';
import { ScreenHeader } from '@/components/common/ScreenHeader';
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
    rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(rawPageState, [business, warehouseId], offset, ['shifts'], () => {
    setOffset(0);
  });
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <section aria-label="Cash shifts" className="screen-section">
      <ScreenHeader
        title="Cash shifts"
        description={
          <>
            Cash only. Open a shift before collecting cash. Confirm money received before recording.
            Closed shifts are immutable.
          </>
        }
      />
      {state.error && <p role="alert">{state.error}</p>}
      <Button
        onClick={() => void model.run()}
        disabled={state.busy}
        variant="ghost"
        size="icon"
        aria-label="Refresh cash shifts"
        title="Refresh"
      >
        <RefreshCw aria-hidden="true" />
      </Button>
      {state.data?.shifts.map((s) => (
        <RecordDetails
          key={s.id}
          label="Cash shift"
          items={[
            { label: 'Shift', value: s.id },
            { label: 'State', value: s.state },
            { label: 'Currency', value: `${s.currency} minor units` },
            { label: 'Expected', value: s.expectedMinor },
            { label: 'Counted', value: s.countedMinor ?? '—' },
            { label: 'Discrepancy', value: s.discrepancyMinor ?? '—' },
          ]}
        />
      ))}

      <Pagination
        label="cash shifts"
        offset={offset}
        pageSize={25}
        hasMore={state.data?.hasMore ?? false}
        busy={state.busy || Boolean(state.error)}
        onChange={setOffset}
      />
      {state.data &&
        cashForms(client, business, warehouseId, locations, state.data.shifts).map((f) => (
          <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
        ))}
    </section>
  );
}
