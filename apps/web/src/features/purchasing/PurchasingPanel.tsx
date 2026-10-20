import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createPurchasingClient,
  createInventoryClient,
  ResourceModel,
  supplierForms,
  purchaseCreateForm,
  purchaseDetailForms,
  purchaseAddLineForm,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/FormControls';
import { authClient } from '@/platform/auth-client';
const operationKey = () => crypto.randomUUID();
export function PurchasingPanel({
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
    [supplierId, setSupplierId] = useState(''),
    [orderId, setOrderId] = useState('');
  const client = useMemo(
    () => createPurchasingClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const stock = useMemo(
    () => createInventoryClient(authClient.organizationRequest, operationKey, business.id),
    [business.id],
  );
  const model = useMemo(
    () =>
      new ResourceModel(async () => ({
        workspace: await client.load({
          warehouseId,
          search,
          offset,
          ...(supplierId ? { supplierId } : {}),
        }),
        stock: hasPermission(business, 'stock.read')
          ? await stock.load({ warehouseId, search, offset })
          : null,
        detail: orderId ? await client.detail(orderId) : null,
      })),
    [client, stock, business, warehouseId, search, offset, supplierId, orderId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    if (warehouseId) void model.run();
    return model.reset;
  }, [model, warehouseId]);
  const forms =
    state.data && hasPermission(business, 'purchases.write')
      ? [
          ...(state.data.detail?.order.state === 'draft' && state.data.stock
            ? [
                purchaseAddLineForm(
                  client,
                  state.data.workspace,
                  state.data.stock,
                  state.data.detail,
                ),
              ]
            : []),
          ...(!business.scope?.storeId ? supplierForms(client, state.data.workspace) : []),
          ...(state.data.stock
            ? [purchaseCreateForm(client, state.data.workspace, state.data.stock, warehouseId)]
            : []),
          ...(state.data.detail ? purchaseDetailForms(client, state.data.detail) : []),
        ]
      : [];
  return (
    <section aria-label="Purchasing" className="space-y-3 border-t pt-4">
      <h2>Purchasing</h2>
      <p>
        Receipts and returns post stock movements. Invoice references are unallocated obligations;
        payment settlement and accounting are not implemented. After an uncertain request and
        reload, check history before submitting again.
      </p>
      <label htmlFor="purchase-warehouse">Purchasing warehouse</label>
      <Select
        id="purchase-warehouse"
        value={warehouseId}
        onChange={(e) =>
          ((value: string) => {
            setWarehouseId(value);
            setOrderId('');
            setOffset(0);
          })(e.target.value)
        }
      >
        {warehouses
          .map((w) => ({ value: w.id, label: w.name }))
          .map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
      </Select>
      <label htmlFor="purchasing-search">
        Search suppliers / purchase reference / item
        <Input
          id="purchasing-search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
        />
      </label>
      {state.error && <p role="alert">{state.error}</p>}
      <Button onClick={() => void model.run()} disabled={state.busy || !warehouseId}>
        Refresh purchasing
      </Button>
      {state.data && (
        <>
          <label htmlFor="purchase-supplier-history">Supplier history</label>
          <Select
            id="purchase-supplier-history"
            value={supplierId}
            onChange={(e) =>
              ((value: string) => {
                setSupplierId(value);
                setOffset(0);
                setOrderId('');
              })(e.target.value)
            }
          >
            {[
              { value: '', label: 'All suppliers' },
              ...state.data.workspace.suppliers.map((s) => ({ value: s.id, label: s.name })),
            ].map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <label htmlFor="purchase-document">Purchase order</label>
          <Select
            id="purchase-document"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          >
            {[
              { value: '', label: 'Select order' },
              ...state.data.workspace.orders.map((o) => ({
                value: o.id,
                label: `${o.reference} · ${o.state}`,
              })),
            ].map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Button onClick={() => setOffset(Math.max(0, offset - 25))} disabled={!offset}>
            Previous purchasing page
          </Button>
          <Button onClick={() => setOffset(offset + 25)} disabled={!state.data.workspace.hasMore}>
            Next purchasing page
          </Button>
          {state.data.detail && (
            <>
              <p>
                {state.data.detail.order.reference} · {state.data.detail.order.state} ·{' '}
                {state.data.detail.order.currency}
              </p>
              {state.data.detail.lines.map((l) => (
                <p key={l.id}>
                  {l.variantId} · ordered {l.quantity} · received {l.received} · cost {l.unitCost}
                </p>
              ))}
              {state.data.detail.invoices.map((i) => (
                <p key={i.id}>
                  Invoice {i.reference} · unallocated {i.amountMinor} minor units · due {i.dueDate}
                </p>
              ))}
              {state.data.detail.returns.map((r) => (
                <p key={r.id}>
                  Return {r.quantity} · credit reference {r.creditReference} · movement{' '}
                  {r.movementId}
                </p>
              ))}
            </>
          )}
          {forms.map((form) => (
            <CommandForm key={form.title} definition={form} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </section>
  );
}
