import { WarehouseSelect } from '@/components/common/WarehouseSelect';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { SearchControl } from '@/components/common/SearchControl';
import { RefreshCw } from 'lucide-react';
import { PurchaseDetails } from './PurchaseDetails';
import { Grid } from '@/components/common/Layout';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  createPurchasingClient,
  createInventoryClient,
  cancellableResource,
  supplierForms,
  purchaseCreateForm,
  purchaseDetailForms,
  purchaseAddLineForm,
} from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { CommandForm } from '@/components/common/CommandForm';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
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
  const request = useMemo(
    () =>
      cancellableResource(
        async (signal) => ({
          workspace: await client.load(
            {
              warehouseId,
              search,
              offset,
              ...(supplierId ? { supplierId } : {}),
            },
            signal,
          ),
          stock: hasPermission(business, 'stock.read')
            ? await stock.load({ warehouseId, search, offset }, signal)
            : null,
          detail: orderId ? await client.detail(orderId) : null,
        }),
        () => new AbortController(),
      ),
    [client, stock, business, warehouseId, search, offset, supplierId, orderId],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, search, supplierId],
    offset,
    ['workspace.suppliers', 'workspace.orders'],
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
    <section aria-label="Purchasing" className="screen-section">
      <ScreenHeader
        title="Purchasing"
        description={
          <>
            Receipts and returns post stock movements. Use Supplier balances to record invoice
            credits and cash settlements. After an uncertain request and reload, check history
            before submitting again.
          </>
        }
      />
      <Grid className="screen-filters">
        <div>
          <WarehouseSelect
            label="Purchasing warehouse"
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
          </WarehouseSelect>
        </div>
        <div>
          <SearchControl
            label="Search suppliers / purchase reference / item"
            suggestions={
              state.data?.workspace.suppliers.map((item) => ({
                value: item.name,
                label: item.name,
              })) ?? []
            }
            busy={state.busy || (!state.data && !state.error)}
            emptyMessage="No matching records. Try another name or code."
            value={search}
            onChange={(value) => {
              setSearch(value);
              setOffset(0);
            }}
          />
        </div>
        <Button
          onClick={() => void model.run()}
          disabled={state.busy || !warehouseId}
          variant="ghost"
          size="icon"
          aria-label="Refresh purchasing"
          title="Refresh"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </Grid>
      {state.error && <p role="alert">{state.error}</p>}
      {state.data && (
        <>
          <Grid className="screen-filters">
            <div>
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
            </div>
            <div>
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
            </div>
          </Grid>
          <Pagination
            label="purchasing"
            offset={offset}
            pageSize={25}
            hasMore={state.data?.workspace.hasMore ?? false}
            busy={state.busy || (!state.data && !state.error)}
            onChange={setOffset}
          />
          {state.data.detail && <PurchaseDetails detail={state.data.detail} />}
          {forms.map((form) => (
            <CommandForm key={form.title} definition={form} run={(work) => void model.run(work)} />
          ))}
        </>
      )}
    </section>
  );
}
