import { TradingRelationships, TradingDetails } from './TradingEvidence';
import { RecordCollection } from '../ui/RecordCollection';
import { SidePanel } from '../ui/SidePanel';
import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { LoadingState, ErrorState } from '../ui/AsyncState';
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
  const [selectedRecord, setSelectedRecord] = useState('');
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
  useEffect(() => {
    if (open) void model.run();
    return model.reset;
  }, [model, open]);
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
          {state.busy && <LoadingState message="Loading…" />}
          {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
          <IconAction
            label="Refresh trading"
            onPress={() => void model.run()}
            disabled={state.busy}
            icon="↻"
          />
          {state.data && (
            <>
              <TradingRelationships items={state.data.relationships} />
              <Text accessibilityRole="header">Shared orders</Text>
              <RecordCollection
                label="trading orders"
                onOpen={setSelectedRecord}
                items={state.data.orders.map((o) => ({
                  id: o.id,
                  title: o.reference,
                  subtitle: o.currency,
                  detail: `${o.lines.length} ${o.lines.length === 1 ? 'line' : 'lines'}`,
                  status: o.state[0]!.toUpperCase() + o.state.slice(1),
                  tone: o.state === 'received' ? 'success' : 'neutral',
                }))}
              />
              <SidePanel
                title="Shared order details"
                open={!!selectedRecord}
                onClose={() => setSelectedRecord('')}
              >
                {state.data.orders
                  .filter((item) => item.id === selectedRecord)
                  .map((o) => (
                    <View key={o.id}>
                      <TradingDetails order={o} timeZone={business.timeZone} />
                      <TradingHistory client={client} id={o.id} timeZone={business.timeZone} />
                    </View>
                  ))}
              </SidePanel>
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
