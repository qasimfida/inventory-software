import { FormSheet } from '@/components/common/FormSheet';
import { RecordDetails } from '@/components/common/RecordDetails';
import { IconButton } from '@/components/common/IconButton';
import { EmptyState, ErrorState, LoadingState } from '@/components/common/AsyncState';
import { RecordCollection } from '@/components/common/RecordCollection';
import { FilterButton } from '@/components/common/FilterButton';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
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
  const selectedSupplier = state.data?.workspace.suppliers.find(
    (supplier) => supplier.id === supplierId,
  );
  const supplierAction = (title: string) =>
    title === 'Create supplier' || title.startsWith('Save supplier ');
  const renderCommand = (form: (typeof forms)[number]) => (
    <CommandForm key={form.title} definition={form} run={(work) => void model.run(work)} />
  );
  return (
    <section aria-label="Purchasing" className="screen-section">
      <ScreenHeader
        title="Purchasing & suppliers"
        description={
          <>
            Receipts and returns post stock movements. Use Supplier balances to record invoice
            credits and cash settlements. After an uncertain request and reload, check history
            before submitting again.
          </>
        }
      />
      <div className="collection-toolbar">
        <div className="collection-search">
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
        <Popover>
          <PopoverTrigger asChild>
            <FilterButton
              aria-label="Purchasing filters"
              active={[
                supplierId && 'Supplier selected',
                warehouseId &&
                  `Warehouse: ${warehouses.find((w) => w.id === warehouseId)?.name ?? warehouseId}`,
              ].filter((v): v is string => !!v)}
            />
          </PopoverTrigger>
          <PopoverContent align="end" className="space-y-3">
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
            {state.data && (
              <>
                {' '}
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
                        ...state.data.workspace.suppliers.map((s) => ({
                          value: s.id,
                          label: s.name,
                        })),
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
              </>
            )}
          </PopoverContent>
        </Popover>
        <IconButton
          label="Refresh purchasing"
          icon={RefreshCw}
          disabled={state.busy || !warehouseId}
          onClick={() => void model.run()}
        />
      </div>
      {!warehouseId && (
        <EmptyState
          message="No active warehouse"
          description="Select or request access to an active warehouse to view purchasing."
        />
      )}
      {state.error && <ErrorState message={state.error} onRetry={() => void model.run()} />}
      {warehouseId && !state.data && !state.error && <LoadingState message="Loading purchasing…" />}
      {state.data && (
        <>
          <Pagination
            label="purchasing"
            offset={offset}
            pageSize={25}
            hasMore={state.data?.workspace.hasMore ?? false}
            busy={state.busy || (!state.data && !state.error)}
            onChange={setOffset}
          />
          <h3>Purchase orders</h3>
          <RecordCollection
            label="purchase orders"
            actions={forms.filter((f) => f.title === 'Create purchase order').map(renderCommand)}
            columns={['Reference', 'Supplier', 'Currency']}
            onOpen={setOrderId}
            items={state.data.workspace.orders.map((o) => ({
              id: o.id,
              title: o.reference,
              subtitle:
                state.data!.workspace.suppliers.find((supplier) => supplier.id === o.supplierId)
                  ?.name ?? 'Supplier outside this page',
              detail: o.currency,
              status: o.state.replaceAll('_', ' '),
              tone:
                o.state === 'completed'
                  ? 'success'
                  : o.state === 'partially_received'
                    ? 'warning'
                    : 'neutral',
            }))}
          />
          <h3>Suppliers</h3>
          <RecordCollection
            label="suppliers"
            actions={forms
              .filter(
                (f) =>
                  f.title === 'Create supplier' ||
                  (selectedSupplier && f.title === `Save supplier ${selectedSupplier.code}`),
              )
              .map(renderCommand)}
            columns={['Supplier', 'Code', 'Contact']}
            onOpen={(id) => {
              setSupplierId(id);
              setOrderId('');
              setOffset(0);
            }}
            items={state.data.workspace.suppliers.map((supplier) => ({
              id: supplier.id,
              title: supplier.name,
              subtitle: supplier.code,
              detail: supplier.email || supplier.phone || 'No contact details',
              status: supplier.state,
              tone: supplier.state === 'active' ? 'success' : 'neutral',
            }))}
          />
          {selectedSupplier && (
            <RecordDetails
              label="Supplier details"
              items={[
                { label: 'Supplier', value: selectedSupplier.name },
                { label: 'Code', value: selectedSupplier.code },
                { label: 'Email', value: selectedSupplier.email || 'Not provided' },
                { label: 'Phone', value: selectedSupplier.phone || 'Not provided' },
                { label: 'Notes', value: selectedSupplier.notes || 'None' },
                { label: 'Status', value: selectedSupplier.state },
              ]}
            />
          )}
          {state.data.detail && (
            <FormSheet
              title={`Purchase ${state.data.detail.order.reference}`}
              open
              onOpenChange={(open) => {
                if (!open && !state.busy) setOrderId('');
              }}
            >
              <div className="space-y-3 shrink-0 min-w-0">
                <PurchaseDetails detail={state.data.detail} timeZone={business.timeZone} />
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Purchase order actions"
                >
                  {forms
                    .filter((f) => !supplierAction(f.title) && f.title !== 'Create purchase order')
                    .map(renderCommand)}
                </div>
              </div>
            </FormSheet>
          )}
        </>
      )}
    </section>
  );
}
