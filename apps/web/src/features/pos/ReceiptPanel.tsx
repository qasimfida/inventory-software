import { RecordCollection } from '@/components/common/RecordCollection';
import { FormSheet } from '@/components/common/FormSheet';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createSalesClient,
  formatMinorUnits,
  returnForms,
  receiptText,
  cancellableResource,
} from '@inventory/api-client';
import { businessTime, type Business } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
import { CommandForm } from '@/components/common/CommandForm';
import { authClient } from '@/platform/auth-client';
import { printReceipt } from '@/platform/receipt-printer';
const operationKey = () => crypto.randomUUID();
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
      <div className="collection-search">
        <SearchControl
          label="Find sale ID"
          suggestions={
            state.data?.page.sales.map((item) => ({ value: item.id, label: item.id })) ?? []
          }
          busy={state.busy || (!state.data && !state.error)}
          emptyMessage="No matching records. Try another name or code."
          value={search}
          onChange={(value) => {
            setSearch(value);
            setOffset(0);
            setId('');
          }}
        />
      </div>
      <Button
        onClick={() => void model.run()}
        disabled={state.busy}
        variant="ghost"
        size="icon"
        aria-label="Refresh sale history"
        title="Refresh"
      >
        <RefreshCw aria-hidden="true" />
      </Button>
    </>
  );
  return (
    <section aria-label="Sale history and receipts" className="screen-section">
      <ScreenHeader title="Sale history and receipts" />
      <p>
        Sale history, receipts and corrections. Exchange: complete an exchange return, then enter
        its ID on a replacement checkout in the same warehouse for the same customer. Refund and
        replacement charge are separate confirmed transactions.
      </p>

      {state.error && <p role="alert">{state.error}</p>}

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
        columns={['Sale date', 'Receipt ID', 'Total']}
      />
      <Pagination
        label="sales"
        offset={offset}
        pageSize={25}
        hasMore={state.data?.page.hasMore ?? false}
        busy={state.busy || (!state.data && !state.error)}
        onChange={setOffset}
      />
      <FormSheet
        title="Sale receipt"
        open={!!id}
        onOpenChange={(open) => {
          if (!open) setId('');
        }}
      >
        {state.error && <p role="alert">{state.error}</p>}
        {state.data?.receipt && (
          <>
            <pre className="whitespace-pre-wrap break-words">{receiptText(state.data.receipt)}</pre>
            <Button
              onClick={() => {
                setPrintError('');
                void printReceipt(receiptText(state.data!.receipt!)).catch(() =>
                  setPrintError(
                    'Unable to open print dialog. Receipt remains available; printing does not change payment status.',
                  ),
                );
              }}
              disabled={false}
            >
              Print / reprint receipt
            </Button>
            {printError && <p role="alert">{printError}</p>}
            {returnForms(client, business, state.data.receipt).map((f) => (
              <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
            ))}
          </>
        )}
      </FormSheet>
    </section>
  );
}
