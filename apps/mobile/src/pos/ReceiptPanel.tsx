import { View } from 'react-native';
import { RecordCollection } from '../ui/RecordCollection';
import { SidePanel } from '../ui/SidePanel';
import { usePageCollection } from '../ui/usePageCollection';
import { Pagination } from '../ui/Pagination';
import { SearchControl } from '../ui/SearchControl';
import { IconAction } from '../ui/IconAction';
import { ScreenBody, ScreenHeader } from '../ui/ScreenHeader';
import { Text } from '../ui/Themed';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createSalesClient,
  formatMinorUnits,
  returnForms,
  receiptText,
  cancellableResource,
} from '@inventory/api-client';
import { businessTime, type Business } from '@inventory/contracts';
import { Action } from '../organization/Controls';
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
  const request = useMemo(
    () =>
      cancellableResource(
        async (signal) => ({
          page: await client.list({ warehouseId, search, offset }, signal),
          receipt: id ? await client.receipt(id) : null,
        }),
        () => new AbortController(),
      ),
    [client, warehouseId, search, offset, id],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, search],
    offset,
    ['page.sales'],
    () => {
      setOffset(0);
    },
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      if (warehouseId) void model.run();
    }, 250);
    return () => {
      clearTimeout(timer);
      request.cancel();
    };
  }, [model, request, warehouseId]);
  const toolbar = (
    <>
      <View style={{ flexGrow: 1, flexBasis: 160 }}>
        <SearchControl
          suggestions={
            state.data?.page.sales.map((item) => ({ value: item.id, label: item.id })) ?? []
          }
          busy={state.busy || (!state.data && !state.error)}
          label="Find sale ID"
          value={search}
          onChange={(v) => {
            setSearch(v);
            setOffset(0);
            setId('');
          }}
        />
      </View>
      <IconAction
        label="Refresh sale history"
        onPress={() => void model.run()}
        disabled={state.busy}
        icon="↻"
      />
    </>
  );
  return (
    <ScreenBody>
      <ScreenHeader title="Sale history and receipts" />
      <Text>
        Sale history, receipts and corrections. Exchange: complete an exchange return, then enter
        its ID on a replacement checkout in the same warehouse for the same customer. Refund and
        replacement charge are separate confirmed transactions.
      </Text>

      {Boolean(state.error) && <Text accessibilityRole="alert">{state.error}</Text>}

      <RecordCollection
        toolbar={toolbar}
        label="receipts"
        onOpen={(value) => {
          setPrintError('');
          setId(value);
        }}
        items={(state.data?.page.sales ?? []).map((sale) => ({
          id: sale.id,
          title: businessTime(sale.createdAt, business.timeZone),
          subtitle: sale.id,
          detail: formatMinorUnits(sale.totalMinor, sale.currency),
          status: sale.state.replaceAll('_', ' '),
          tone:
            sale.state === 'completed'
              ? 'success'
              : sale.state === 'voided'
                ? 'neutral'
                : 'warning',
        }))}
      />
      <Pagination
        label="sales"
        offset={offset}
        pageSize={25}
        hasMore={state.data?.page.hasMore ?? false}
        busy={state.busy || (!state.data && !state.error)}
        onChange={setOffset}
      />
      <SidePanel title="Sale receipt" open={!!id} onClose={() => setId('')}>
        {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
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
            {Boolean(printError) && <Text accessibilityRole="alert">{printError}</Text>}
            {returnForms(client, business, state.data.receipt).map((f) => (
              <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
            ))}
          </>
        )}
      </SidePanel>
    </ScreenBody>
  );
}
