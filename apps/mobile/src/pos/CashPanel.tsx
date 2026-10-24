import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { RecordDetails } from '../ui/RecordDetails';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createCashClient, cashForms, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { CommandForm } from '../components/CommandForm';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';

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
    <ScreenBody>
      <ScreenHeader
        title="Cash shifts"
        description={
          <>
            Cash only. Open a shift before collecting cash. Confirm money received before recording.
            Closed shifts are immutable.
          </>
        }
      />
      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
      <IconAction
        label="Refresh cash shifts"
        onPress={() => void model.run()}
        disabled={state.busy}
        icon="↻"
      />
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
    </ScreenBody>
  );
}
