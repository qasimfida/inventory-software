import { TradingRelationships, TradingDetails } from './TradingEvidence';
import { RecordCollection } from '@/components/common/RecordCollection';
import { FormSheet } from '@/components/common/FormSheet';
import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { LoadingState, ErrorState } from '@/components/common/AsyncState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TradingHistory } from './TradingHistory';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createTradingClient, tradingForms, ResourceModel } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { IconButton } from '@/components/common/IconButton';
import { CommandForm } from '@/components/common/CommandForm';
export function TradingPanel({ business }: { business: Business }) {
  const [selectedRecord, setSelectedRecord] = useState('');
  const [offset, setOffset] = useState(0);
  const client = useMemo(
    () =>
      createTradingClient(authClient.organizationRequest, () => crypto.randomUUID(), business.id),
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
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <section aria-label="Business trading" className="screen-section">
      <ScreenHeader
        title="Business trading"
        description={
          <>
            Online only. Inspect history after an uncertain response or restart before submitting
            another command.
          </>
        }
      />
      <p>
        Share only agreed item descriptions, units and prices. Dispatch and receipt here track
        coordination; record the actual sale and purchase receipt in each business to change stock
        and balances.
      </p>
      <p>Your business ID: {business.id}</p>
      {state.busy && <LoadingState message="Loading…" />}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      <IconButton
        label="Refresh trading"
        icon={RefreshCw}
        onClick={() => void model.run()}
        disabled={state.busy}
      />
      {state.data && (
        <>
          <TradingRelationships items={state.data.relationships} />
          <h3>Shared orders</h3>
          <RecordCollection
            label="trading orders"
            columns={['Order reference', 'Currency', 'Shared lines']}
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
          <FormSheet
            title="Shared order details"
            description="Review shared terms and coordination history. This view does not post stock or money."
            open={!!selectedRecord}
            onOpenChange={(open) => {
              if (!open) setSelectedRecord('');
            }}
          >
            {state.data.orders
              .filter((item) => item.id === selectedRecord)
              .map((o) => (
                <div key={o.id} className="min-w-0 shrink-0 space-y-3">
                  <TradingDetails order={o} timeZone={business.timeZone} />
                  <TradingHistory client={client} id={o.id} timeZone={business.timeZone} />
                </div>
              ))}
          </FormSheet>
          <fieldset disabled={state.busy} className="min-w-0 space-y-3">
            {tradingForms(client, state.data, business.id).map((f) => (
              <CommandForm
                key={f.title + JSON.stringify(state.data)}
                definition={f}
                run={(work) => {
                  if (!state.busy) void model.run(work);
                }}
              />
            ))}
          </fieldset>

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
    </section>
  );
}
