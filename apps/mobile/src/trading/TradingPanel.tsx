import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { LoadingState, EmptyState } from '../ui/AsyncState';
import { ScreenBody } from '../ui/ScreenHeader';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { TradingHistory } from './TradingHistory';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createTradingClient, tradingForms, ResourceModel } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { styles } from '../ui/Controls';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { CommandForm } from '../components/CommandForm';
export function TradingPanel({ business, page = false }: { business: Business; page?: boolean }) {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(page);
  const client = useMemo(
    () => createTradingClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const model = useMemo(() => new ResourceModel(() => client.load(offset)), [client, offset]);
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business],
    offset,
    ['relationships', 'orders'],
    () => {
      setOffset(0);
    },
  );
  const allowed = true;
  useEffect(() => {
    if (allowed && open) void model.run();
    return model.reset;
  }, [model, allowed, open]);
  return (
    <ScreenBody>
      <DisclosureTrigger
        expanded={open}
        label="Business trading"
        onPress={() => setOpen(!open)}
        disabled={false}
      />
      {open && (
        <>
          <Text>
            Online only. Inspect history after an uncertain response or restart before submitting
            another command.
          </Text>
          <Text>
            Share only agreed item descriptions, units and prices. Dispatch and receipt here track
            coordination; record the actual sale and purchase receipt in each business to change
            stock and balances.
          </Text>
          <Text>Your business ID: {business.id}</Text>
          {!allowed && (
            <Text>
              Accounting requires business-wide reports, payments, sales and purchasing read
              permissions.
            </Text>
          )}
          {state.busy && <LoadingState message="Loading…" />}
          {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
          <IconAction
            label="Refresh trading"
            onPress={() => void model.run()}
            disabled={state.busy || !allowed}
            icon="↻"
          />
          {state.data && (
            <>
              {!state.data.relationships.length && (
                <EmptyState message="No trading relationships. Ask a partner owner for their business ID." />
              )}
              {state.data.relationships.map((r) => (
                <Text key={r.id}>
                  Relationship {r.id} · {r.proposerId} / {r.partnerId} · {r.state}
                </Text>
              ))}
              {!state.data.orders.length && <EmptyState message="No shared orders on this page." />}
              {state.data.orders.map((o) => (
                <View key={o.id}>
                  <Text>
                    {o.reference} · {o.state} · buyer {o.buyerId} · seller {o.sellerId}
                  </Text>
                  <TradingHistory client={client} id={o.id} />
                  {o.lines.map((l, i) => (
                    <Text key={i}>
                      {l.description}: {l.quantity} {l.unit} at {l.unitPriceMinor} {o.currency}{' '}
                      minor units each
                    </Text>
                  ))}
                </View>
              ))}
              <View style={styles.group}>
                {tradingForms(client, state.data, business.id).map((f) => (
                  <CommandForm
                    key={f.title + JSON.stringify(state.data)}
                    definition={f}
                    run={(work) => {
                      if (!state.busy) void model.run(work);
                    }}
                  />
                ))}
              </View>

              <Pagination
                label="trading records"
                offset={offset}
                pageSize={50}
                hasMore={state.data.hasMoreRelationships || state.data.hasMoreOrders}
                busy={state.busy || Boolean(state.error)}
                onChange={setOffset}
              />
            </>
          )}
        </>
      )}
    </ScreenBody>
  );
}
