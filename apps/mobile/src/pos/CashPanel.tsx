import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createCashClient, cashForms, ResourceModel } from '@inventory/api-client';
import type { Business, Location } from '@inventory/contracts';
import { View, Text } from 'react-native';
import { Action } from '../organization/Controls';
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
    state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <View>
      <Text accessibilityRole="header">Cash shifts</Text>
      <Text>
        Cash only. Open a shift before collecting cash. Confirm money received before recording.
        Closed shifts are immutable.
      </Text>
      {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      <Action label="Refresh cash shifts" onPress={() => void model.run()} disabled={state.busy} />
      {state.data?.shifts.map((s) => (
        <Text key={s.id}>
          Shift {s.id} · {s.state} · {s.currency} minor units · expected {s.expectedMinor} · counted{' '}
          {s.countedMinor ?? '—'} · discrepancy {s.discrepancyMinor ?? '—'}
        </Text>
      ))}
      <Action
        label="Previous shifts"
        onPress={() => setOffset(Math.max(0, offset - 25))}
        disabled={!offset}
      />
      <Action
        label="Next shifts"
        onPress={() => setOffset(offset + 25)}
        disabled={!state.data?.hasMore}
      />
      {state.data &&
        cashForms(client, business, warehouseId, locations, state.data.shifts).map((f) => (
          <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
        ))}
    </View>
  );
}
