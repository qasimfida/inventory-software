import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createTransferClient,
  createInventoryClient,
  ResourceModel,
  transferCreateForm,
  transferDetailForms,
  transferAddLineForm,
} from '@inventory/api-client';
import { hasPermission, businessTime } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { authClient } from '@/platform/auth-client';
const operationKey = () => crypto.randomUUID();
export function TransferPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? ''),
    [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [transferId, setTransferId] = useState('');
  const client = useMemo(
      () => createTransferClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    ),
    stock = useMemo(
      () => createInventoryClient(authClient.organizationRequest, operationKey, business.id),
      [business.id],
    );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        workspace: await client.load({ warehouseId, search, offset }),
        stock: await stock.load({ warehouseId, search, offset }),
        detail: transferId ? await client.detail(transferId) : null,
      })),
    [client, stock, warehouseId, search, offset, transferId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    if (warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId]);
  const forms =
    state.data && hasPermission(business, 'stock.write')
      ? [
          transferCreateForm(client, state.data.stock, warehouses, warehouseId),
          ...(state.data.detail?.transfer.state === 'draft'
            ? [transferAddLineForm(client, state.data.stock, warehouses, state.data.detail)]
            : []),
          ...(state.data.detail ? transferDetailForms(client, state.data.detail) : []),
        ]
      : [];
  return (
    <section aria-label="Stock transfers" className="space-y-3 border-t pt-4">
      <h2>Stock transfers</h2>
      <p>
        Approval reserves stock. Dispatch moves it into transit. Receipt records good, damaged and
        explicitly confirmed lost quantities. Access to both warehouses is required; inter-business
        transfers are blocked.
      </p>
      <label htmlFor="transfer-warehouse">Transfer warehouse</label>
      <Select
        id="transfer-warehouse"
        value={warehouseId}
        onChange={(e) => {
          setWarehouseId(e.target.value);
          setTransferId('');
          setOffset(0);
        }}
      >
        {warehouses.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </Select>
      <label htmlFor="transfer-search">Search transfer reference / item</label>
      <Input
        id="transfer-search"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOffset(0);
        }}
      />
      {state.error && <p role="alert">{state.error}</p>}
      <Button onClick={() => void model.run()} disabled={state.busy || !warehouseId}>
        Refresh transfers
      </Button>
      {state.data && (
        <>
          <label htmlFor="transfer-document">Transfer document</label>
          <Select
            id="transfer-document"
            value={transferId}
            onChange={(e) => setTransferId(e.target.value)}
          >
            <option value="">Select transfer</option>
            {state.data.workspace.transfers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.reference} · {t.state}
              </option>
            ))}
          </Select>
          <Button disabled={!offset} onClick={() => setOffset(Math.max(0, offset - 25))}>
            Previous transfers page
          </Button>
          <Button disabled={!state.data.workspace.hasMore} onClick={() => setOffset(offset + 25)}>
            Next transfers page
          </Button>
          {state.data.detail && (
            <>
              <p>
                {state.data.detail.transfer.reference} · {state.data.detail.transfer.state}
              </p>
              {state.data.detail.lines.map((l) => (
                <p key={l.id}>
                  {l.variantId} · approved base units {l.baseQuantity} · settled {l.settled}
                </p>
              ))}
              {state.data.detail.receipts.map((r) => (
                <p key={r.id}>
                  Receipt {r.id} · good {r.received} · damaged {r.damaged} · shortage {r.shortage} ·{' '}
                  {r.reason}
                </p>
              ))}
              {state.data.detail.events.map((e) => (
                <p key={e.id}>
                  {businessTime(e.createdAt, business.timeZone)} · {e.action} · actor {e.actorId} ·{' '}
                  {e.reason}
                </p>
              ))}
            </>
          )}
          {forms.map((f) => (
            <CommandForm key={f.title} definition={f} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </section>
  );
}
