import { StockPlanning } from './StockPlanning';
import { ManageProduct } from '../catalog/ManageProduct';
import { StockAdjustment } from './StockAdjustment';
import { AccordionSection } from '@/components/ui/Accordion';
import { CursorPagination } from '@/components/common/CursorPagination';
import { usePageCollection } from '@/components/common/usePageCollection';
import { Pagination } from '@/components/common/Pagination';
import { RefreshCw } from 'lucide-react';
import { InventoryOverview } from './InventoryOverview';
import { MovementHistory } from './MovementHistory';
import { ScreenHeader } from '@/components/common/ScreenHeader';
import { StockTable } from './StockTable';
import { LoadingState } from '@/components/common/AsyncState';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { createInventoryClient, cancellableResource, inventoryForms } from '@inventory/api-client';
import { hasPermission } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { CommandForm } from '@/components/common/CommandForm';
import { Input } from '@/components/ui/FormControls';
import { Button } from '@/components/ui/Button';
export function InventoryPanel({
  business,
  locations,
}: {
  business: Business;
  locations: Location[];
}) {
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [adjusting, setAdjusting] = useState('');
  const warehouses = locations.filter((l) => l.kind === 'warehouses' && l.state === 'active');
  const warehouseId = warehouses[0]?.id ?? '';
  const [search, setSearch] = useState(''),
    [offset, setOffset] = useState(0),
    [cursor, setCursor] = useState<string | undefined>(undefined),
    [reconciliation, setReconciliation] = useState(''),
    [actionsOpen, setActionsOpen] = useState(false);
  const client = useMemo(
    () =>
      createInventoryClient(authClient.organizationRequest, () => crypto.randomUUID(), business.id),
    [business.id],
  );
  const request = useMemo(
    () =>
      cancellableResource(
        (signal) =>
          client.load({ warehouseId, search, offset, ...(cursor ? { cursor } : {}) }, signal),
        () => new AbortController(),
      ),
    [client, warehouseId, search, offset, cursor],
  );
  const { model } = request;
  const rawPageState = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  const state = usePageCollection(
    rawPageState,
    [business, warehouseId, search],
    [offset, cursor],
    ['items', 'balances', 'reservations', 'movements'],
    () => {
      setOffset(0);
      setCursor(undefined);
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
  return (
    <section aria-label="Inventory ledger" className="screen-section">
      <ScreenHeader title="Inventory" description="Monitor available stock by warehouse." />
      {!warehouses.length ? (
        <p>Create an active warehouse to manage stock.</p>
      ) : (
        <>
          {hasPermission(business, 'stock.write') && (
            <StockAdjustment
              sku={adjusting}
              data={state.data ?? null}
              client={client}
              warehouseId={warehouseId}
              error={state.error}
              busy={state.busy}
              run={(work) => void model.run(work)}
              onClose={() => setAdjusting('')}
            />
          )}
          {editingProduct && (
            <ManageProduct
              business={business}
              locations={locations}
              productId={editingProduct}
              onClose={() => setEditingProduct(null)}
            />
          )}
          {state.data && (
            <StockPlanning
              key={`planning-${warehouseId}`}
              business={business}
              warehouseId={warehouseId}
              stock={state.data}
              onChanged={() => void model.run()}
            />
          )}
          <InventoryOverview
            onEdit={
              hasPermission(business, 'products.write') && !business.scope?.storeId
                ? setEditingProduct
                : undefined
            }
            key={`overview-${warehouseId}`}
            businessId={business.id}
            warehouseId={warehouseId}
            revision={state.data}
            onAdjust={
              hasPermission(business, 'stock.write')
                ? (sku) => {
                    setSearch(sku);
                    setOffset(0);
                    setAdjusting(sku);
                  }
                : undefined
            }
          />
          <AccordionSection
            open={actionsOpen}
            onOpenChange={setActionsOpen}
            id="stock-actions"
            className="space-y-4 rounded-lg border p-4"
            title={<>Stock operations and movement history</>}
          >
            <p className="text-sm text-muted-foreground">
              Available = on hand − reserved − damaged. In transit is separate. After an uncertain
              request followed by reload or sign-in, inspect history before creating another
              command.
            </p>
            <div className="collection-toolbar">
              <div className="collection-search">
                <label htmlFor="stock-search">Search stock item / SKU</label>
                <Input
                  id="stock-search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setOffset(0);
                  }}
                  maxLength={120}
                />
              </div>
              <Button
                disabled={state.busy}
                onClick={() => void model.run()}
                variant="ghost"
                size="icon"
                aria-label="Refresh inventory"
                title="Refresh"
              >
                <RefreshCw aria-hidden="true" />
              </Button>
            </div>
            {state.error && <p role="alert">{state.error}</p>}
            {state.busy && <LoadingState message="Loading inventory…" />}

            {state.data && (
              <>
                <p>
                  {state.data.totals.balances} balance records; negative stock{' '}
                  {state.data.policy.allowNegative ? 'allowed' : 'blocked'}.
                </p>
                <h3>Balances by location</h3>
                <StockTable stock={state.data} />
                <Pagination
                  label="stock records"
                  offset={offset}
                  pageSize={state.data.limit}
                  total={Math.max(...Object.values(state.data.totals))}
                  hasMore={state.data.hasMore}
                  busy={state.busy || Boolean(state.error)}
                  onChange={setOffset}
                />
                {hasPermission(business, 'stock.write') &&
                  inventoryForms(client, state.data, warehouseId).map((form) => (
                    <CommandForm
                      key={form.title}
                      definition={form}
                      run={(work) => void model.run(work)}
                    />
                  ))}
                {hasPermission(business, 'business.write') && (
                  <CommandForm
                    definition={{
                      title: 'Save inventory policy',
                      fields: [
                        {
                          name: 'allowNegative',
                          label: 'Allow negative stock',
                          kind: 'boolean',
                          value: state.data.policy.allowNegative,
                        },
                      ],
                      submit: (v) =>
                        client.policy({
                          allowNegative: v.allowNegative === true,
                          version: state.data!.policy.version,
                        }),
                    }}
                    run={(work) => void model.run(work)}
                  />
                )}
                <Button
                  onClick={() =>
                    void model.run(async () => {
                      const result = await client.reconcile(warehouseId);
                      setReconciliation(
                        result.consistent
                          ? 'Ledger and balances reconcile.'
                          : `${result.mismatches.length} mismatches require investigation.`,
                      );
                    })
                  }
                >
                  Reconcile inventory
                </Button>
                {reconciliation && <p role="status">{reconciliation}</p>}
                <h3>Movement history</h3>
                <MovementHistory stock={state.data} timeZone={business.timeZone} />
                {state.data && (
                  <CursorPagination
                    label="stock movements"
                    previous={Boolean(cursor)}
                    hasMore={Boolean(state.data.nextCursor)}
                    busy={state.busy || Boolean(state.error)}
                    onReset={() => setCursor(undefined)}
                    onNext={() => setCursor(state.data?.nextCursor ?? undefined)}
                  />
                )}
              </>
            )}
          </AccordionSection>
        </>
      )}
    </section>
  );
}
