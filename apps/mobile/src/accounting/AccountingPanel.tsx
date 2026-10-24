import { Pagination } from '../ui/Pagination';
import { usePageCollection } from '../ui/usePageCollection';
import { IconAction } from '../ui/IconAction';
import { LoadingState, EmptyState } from '../ui/AsyncState';
import { RecordDetails } from '../ui/RecordDetails';
import { ScreenBody } from '../ui/ScreenHeader';
import { DisclosureTrigger } from '../ui/DisclosureTrigger';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createAccountingClient,
  accountingForms,
  ResourceModel,
  canReadAccounting,
} from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { styles } from '../ui/Controls';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { CommandForm } from '../components/CommandForm';
export function AccountingPanel({
  business,
  page = false,
}: {
  business: Business;
  page?: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState(page);
  const client = useMemo(
    () => createAccountingClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const model = useMemo(() => new ResourceModel(() => client.load(offset)), [client, offset]);
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(rawPageState, [business], offset, ['journals', 'pending'], () => {
    setOffset(0);
  });
  const allowed = canReadAccounting(business);
  useEffect(() => {
    if (allowed && open) void model.run();
    return model.reset;
  }, [model, allowed, open]);
  return (
    <ScreenBody>
      <DisclosureTrigger
        expanded={open}
        label="Accounting"
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
            Accounting foundation: posted entries only. Amounts are integer currency minor units.
            Purchases are expensed; inventory valuation, COGS, tax filing and statutory accounts are
            not implemented.
          </Text>
          <Text>
            Review each posting before confirmation. Manual journals do not change stock or AR/AP.
            Reversing a source journal requires an explicit correcting journal; it does not reverse
            the original transaction.
          </Text>
          {!allowed && (
            <Text>
              Accounting requires business-wide reports, payments, sales and purchasing read
              permissions.
            </Text>
          )}
          {state.busy && <LoadingState message="Loading…" />}
          {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}
          <IconAction
            label="Refresh accounting"
            onPress={() => void model.run()}
            disabled={state.busy || !allowed}
            icon="↻"
          />
          {state.data && (
            <>
              {!state.data.journals.length && (
                <EmptyState message="No posted journals on this page." />
              )}
              <Text>
                Trial balance — all posted entries, all dates; currencies remain separate.
              </Text>
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
                <Text key={p.id}>
                  Period {p.from} — {p.to} · {p.state}
                </Text>
              ))}
              {state.data.journals.map((j) => (
                <View key={j.id}>
                  <Text>
                    {j.date} · {j.id} · {j.sourceKind} {j.sourceId} · {j.currency} · {j.reason}{' '}
                    {j.reversalId && `reverses ${j.reversalId}`}
                  </Text>
                  {j.lines.map((l, i) => (
                    <Text key={i}>
                      {l.account}: debit {l.debit}, credit {l.credit}
                    </Text>
                  ))}
                </View>
              ))}
              <Text>
                Unposted source records on this page: {state.data.pending.length}. A zero count on a
                later page does not prove reconciliation.
              </Text>
              <View style={styles.group}>
                {accountingForms(client, state.data, business).map((f) => (
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
                label="journals"
                offset={offset}
                pageSize={50}
                hasMore={state.data.hasMore}
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
