import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createSalesClient, returnForms, receiptText, ResourceModel } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { View, Text } from 'react-native';
import { Action, Choice, Field } from '../organization/Controls';
import { CommandForm } from '../components/CommandForm';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { printReceipt } from '../platform/receipt-printer';
export function ReceiptPanel({
  business,
  warehouseId,
}: {
  business: Business;
  warehouseId: string;
}) {
  const [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [id, setId] = useState(''),
    [printError, setPrintError] = useState('');
  const client = useMemo(
    () => createSalesClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        page: await client.list({ warehouseId, search, offset }),
        receipt: id ? await client.receipt(id) : null,
      })),
    [client, warehouseId, search, offset, id],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  return (
    <View>
      <Text>
        Sale history, receipts and corrections. Exchange: complete an exchange return, then enter
        its ID on a replacement checkout in the same warehouse for the same customer. Refund and
        replacement charge are separate confirmed transactions.
      </Text>
      <Field
        label="Find sale ID"
        value={search}
        onChange={(v) => {
          setSearch(v);
          setOffset(0);
          setId('');
        }}
      />
      <Choice
        label="Sale receipt"
        value={id}
        options={[
          { value: '', label: 'Select sale' },
          ...(state.data?.page.sales ?? []).map((s) => ({
            value: s.id,
            label: `${s.createdAt} · ${s.id} · ${s.state}`,
          })),
        ]}
        onChange={setId}
      />
      {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      <Action label="Refresh sale history" onPress={() => void model.run()} disabled={state.busy} />
      <Action
        label="Previous sales"
        onPress={() => setOffset(Math.max(0, offset - 25))}
        disabled={!offset}
      />
      <Action
        label="Next sales"
        onPress={() => setOffset(offset + 25)}
        disabled={!state.data?.page.hasMore}
      />
      {state.data?.receipt && (
        <>
          <Text selectable>{receiptText(state.data.receipt)}</Text>
          <Action
            label="Print / reprint receipt"
            onPress={() => {
              setPrintError('');
              void printReceipt(receiptText(state.data!.receipt!)).catch(() =>
                setPrintError(
                  'Unable to open print dialog. Receipt remains available; printing does not change payment status.',
                ),
              );
            }}
            disabled={false}
          />
          {printError && <Text accessibilityRole="alert">{printError}</Text>}
          {returnForms(client, business, state.data.receipt).map((f) => (
            <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </View>
  );
}
