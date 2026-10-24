import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/common/AsyncState';
import { RecordDetails } from '@/components/common/RecordDetails';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createAccountingClient,
  accountingForms,
  ResourceModel,
  canReadAccounting,
} from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { Button } from '@/components/ui/Button';
import { CommandForm } from '@/components/common/CommandForm';
export function AccountingPanel({ business }: { business: Business }) {
  const [offset, setOffset] = useState(0);
  const client = useMemo(
    () =>
      createAccountingClient(
        authClient.organizationRequest,
        () => crypto.randomUUID(),
        business.id,
      ),
    [business.id],
  );
  const model = useMemo(() => new ResourceModel(() => client.load(offset)), [client, offset]);
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(rawPageState, [business], offset, ['journals', 'pending'], () => {
    setOffset(0);
  });
  const allowed = canReadAccounting(business);
  useEffect(() => {
    if (allowed) void model.run();
    return model.reset;
  }, [model, allowed]);
  return (
    <section aria-label="Accounting" className="screen-section">
      <ScreenHeader
        title="Accounting"
        description={
          <>
            Online only. Inspect history after an uncertain response or restart before submitting
            another command.
          </>
        }
      />
      <p>
        Accounting foundation: posted entries only. Amounts are integer currency minor units.
        Purchases are expensed; inventory valuation, COGS, tax filing and statutory accounts are not
        implemented.
      </p>
      <p>
        Review each posting before confirmation. Manual journals do not change stock or AR/AP.
        Reversing a source journal requires an explicit correcting journal; it does not reverse the
        original transaction.
      </p>
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
        aria-label="Refresh accounting"
        title="Refresh"
      >
        <RefreshCw aria-hidden="true" />
      </Button>
      {state.data && (
        <>
          {!state.data.journals.length && <EmptyState message="No posted journals on this page." />}
          <p>Trial balance — all posted entries, all dates; currencies remain separate.</p>
          {state.data.balances.map((b) => (
            <RecordDetails
              key={`${b.currency}:${b.account}`}
              label="Trial balance account"
              items={[
                { label: 'Account', value: b.account },
                { label: 'Currency', value: b.currency },
                { label: 'Debit (minor units)', value: b.debit },
                { label: 'Credit (minor units)', value: b.credit },
              ]}
            />
          ))}
          {state.data.periods.map((p) => (
            <p key={p.id}>
              Period {p.from} — {p.to} · {p.state}
            </p>
          ))}
          {state.data.journals.map((j) => (
            <div key={j.id}>
              <p>
                {j.date} · {j.id} · {j.sourceKind} {j.sourceId} · {j.currency} · {j.reason}{' '}
                {j.reversalId && `reverses ${j.reversalId}`}
              </p>
              {j.lines.map((l, i) => (
                <p key={i}>
                  {l.account}: debit {l.debit}, credit {l.credit}
                </p>
              ))}
            </div>
          ))}
          <p>
            Unposted source records on this page: {state.data.pending.length}. A zero count on a
            later page does not prove reconciliation.
          </p>
          <fieldset disabled={state.busy} className="min-w-0 space-y-3">
            {accountingForms(client, state.data, business).map((f) => (
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
            label="journals"
            offset={offset}
            pageSize={50}
            hasMore={state.data.hasMore}
            busy={state.busy || Boolean(state.error)}
            onChange={setOffset}
          />
        </>
      )}
    </section>
  );
}
