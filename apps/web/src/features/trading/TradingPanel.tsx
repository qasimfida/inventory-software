import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/common/AsyncState';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { TradingHistory } from './TradingHistory';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createTradingClient, tradingForms, ResourceModel } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { CommandForm } from '@/components/common/CommandForm';
export function TradingPanel({ business }: { business: Business }) {
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
  const allowed = true;
  useEffect(() => {
    if (allowed) void model.run();
    return model.reset;
  }, [model, allowed]);
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
      {!allowed && (
        <p>
          Accounting requires business-wide reports, payments, sales and purchasing read
          permissions.
        </p>
      )}
      {state.busy && <LoadingState message="Loading…" />}
      {state.error && <p role="alert">{state.error}</p>}
      <Button
        onClick={() => void model.run()}
        disabled={state.busy || !allowed}
        variant="ghost"
        size="icon"
        aria-label="Refresh trading"
        title="Refresh"
      >
        <RefreshCw aria-hidden="true" />
      </Button>
      {state.data && (
        <>
          {!state.data.relationships.length && (
            <EmptyState message="No trading relationships. Ask a partner owner for their business ID." />
          )}
          {state.data.relationships.map((r) => (
            <p key={r.id}>
              Relationship {r.id} · {r.proposerId} / {r.partnerId} · {r.state}
            </p>
          ))}
          {!state.data.orders.length && <EmptyState message="No shared orders on this page." />}
          {state.data.orders.map((o) => (
            <div key={o.id}>
              <p>
                {o.reference} · {o.state} · buyer {o.buyerId} · seller {o.sellerId}
              </p>
              <TradingHistory client={client} id={o.id} />
              {o.lines.map((l, i) => (
                <p key={i}>
                  {l.description}: {l.quantity} {l.unit} at {l.unitPriceMinor} {o.currency} minor
                  units each
                </p>
              ))}
            </div>
          ))}
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
