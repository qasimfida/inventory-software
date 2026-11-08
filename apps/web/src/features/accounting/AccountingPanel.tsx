import { AccountingSummary, AccountingPending } from './AccountingSummary';
import { JournalDetails } from './JournalDetails';
import { RecordCollection } from '@/components/common/RecordCollection';
import { FormSheet } from '@/components/common/FormSheet';
import { Pagination } from '@/components/common/Pagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { RefreshCw } from 'lucide-react';
import { LoadingState, ErrorState } from '@/components/common/AsyncState';
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
import { IconButton } from '@/components/common/IconButton';
import { CommandForm } from '@/components/common/CommandForm';
export function AccountingPanel({ business }: { business: Business }) {
  const [selectedRecord, setSelectedRecord] = useState('');
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
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      <IconButton
        label="Refresh accounting"
        icon={RefreshCw}
        onClick={() => void model.run()}
        disabled={state.busy || !allowed}
      />
      {state.data && (
        <>
          <p>Trial balance — all posted entries, all dates; currencies remain separate.</p>
          <AccountingSummary data={state.data} />
          <h3>Posted journals</h3>
          <RecordCollection
            label="journals"
            onOpen={setSelectedRecord}
            items={state.data.journals.map((j) => ({
              id: j.id,
              title: j.reason,
              subtitle: j.date,
              detail: `${j.currency} · ${j.sourceKind}`,
              status: j.reversalId ? 'Reversal' : 'Posted',
              tone: 'neutral',
            }))}
          />
          <FormSheet
            title="Journal details"
            description="Posted journal evidence. A reversal does not undo the original transaction."
            open={!!selectedRecord}
            onOpenChange={(open) => {
              if (!open) setSelectedRecord('');
            }}
          >
            {state.data.journals
              .filter((item) => item.id === selectedRecord)
              .map((j) => (
                <JournalDetails key={j.id} journal={j} timeZone={business.timeZone} />
              ))}
          </FormSheet>
          <p>
            Unposted source records on this page: {state.data.pending.length}. A zero count on a
            later page does not prove reconciliation.
          </p>
          <AccountingPending pending={state.data.pending} />
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
