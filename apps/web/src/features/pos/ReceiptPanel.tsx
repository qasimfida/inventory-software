import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createSalesClient, returnForms, receiptText, ResourceModel } from '@inventory/api-client';
import type { Business } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
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
    <section aria-label="Sale history and receipts">
      <p>
        Sale history, receipts and corrections. Exchange: complete an exchange return, then enter
        its ID on a replacement checkout in the same warehouse for the same customer. Refund and
        replacement charge are separate confirmed transactions.
      </p>
      <label htmlFor="receipt-search">Find sale ID</label>
      <Input
        id="receipt-search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOffset(0);
          setId('');
        }}
      />
      <label htmlFor="receipt-sale">Sale receipt</label>
      <Select id="receipt-sale" value={id} onChange={(e) => setId(e.target.value)}>
        <option value="">Select sale</option>
        {state.data?.page.sales.map((s) => (
          <option key={s.id} value={s.id}>
            {s.createdAt} · {s.id} · {s.state}
          </option>
        ))}
      </Select>
      {state.error && <p role="alert">{state.error}</p>}
      <Button onClick={() => void model.run()} disabled={state.busy}>
        Refresh sale history
      </Button>
      <Button onClick={() => setOffset(Math.max(0, offset - 25))} disabled={!offset}>
        Previous sales
      </Button>
      <Button onClick={() => setOffset(offset + 25)} disabled={!state.data?.page.hasMore}>
        Next sales
      </Button>
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
    </section>
  );
}
