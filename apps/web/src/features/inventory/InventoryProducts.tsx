import { EmptyState } from '@/components/common/AsyncState';
import { posPriceLabel } from '@inventory/api-client';
import { ViewTabs } from '@/components/common/ViewTabs';
import type { ReactNode } from 'react';
import { RowActions } from '@/components/common/RowActions';
import { useId, useState } from 'react';
import { Package, X } from 'lucide-react';
import type { StockOverview } from '@inventory/contracts';
import { stockViews } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Table, TableScroll } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/Drawer';
type Item = StockOverview['items'][number];
function StockBadge({ item }: { item: Item }) {
  return (
    <StatusBadge
      tone={
        item.status === 'in-stock' ? 'success' : item.status === 'low-stock' ? 'warning' : 'error'
      }
    >
      {stockViews.find((v) => v.status === item.status)?.label}
    </StatusBadge>
  );
}
export function InventoryProducts({
  items,
  showEmpty = true,
  controls,
  onAdjust,
  onEdit,
}: {
  items: Item[];
  showEmpty?: boolean;
  controls?: ReactNode;
  onEdit?: ((productId: string) => void) | undefined;
  onAdjust?: ((sku: string) => void) | undefined;
}) {
  const viewId = useId();
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [selection, setSelected] = useState<Item | null>(null);
  const selected = items.find((item) => item.id === selection?.id) ?? null;
  return (
    <>
      <div className="inventory-controls" role="group" aria-label="Inventory view">
        {controls}
        <ViewTabs panelId={viewId} label="Inventory" value={view} onChange={setView} />
      </div>
      <div id={viewId} role="tabpanel" aria-label={`Inventory ${view} view`} tabIndex={0}>
        {!items.length ? (
          showEmpty ? (
            <EmptyState
              message="No matching inventory"
              description="Try another search, stock status or warehouse to find products."
            />
          ) : null
        ) : view === 'list' ? (
          <TableScroll label="Products by stock status">
            <Table>
              <thead>
                <tr>
                  {['Product', 'SKU', 'Unit', 'Price', 'Available', 'Status', 'Actions'].map(
                    (s) => (
                      <th key={s} scope="col" data-actions={s === 'Actions' || undefined}>
                        {s}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">
                      <Button
                        variant="ghost"
                        className="text-left justify-start"
                        onClick={() => setSelected(item)}
                        aria-label={`View ${item.name}`}
                      >
                        {item.name}
                      </Button>
                    </th>
                    <td>{item.sku}</td>
                    <td>{item.unit}</td>
                    <td className="tabular-nums">
                      {item.price ? posPriceLabel({ price: item.price }) : 'Not priced'}
                    </td>
                    <td data-numeric>{item.available}</td>
                    <td>
                      <StockBadge item={item} />
                    </td>
                    <td data-actions>
                      <RowActions
                        label={item.sku}
                        actions={[
                          { label: 'View details', onSelect: () => setSelected(item) },
                          ...(onEdit && item.productId
                            ? [
                                {
                                  label: 'Edit product details and pricing',
                                  onSelect: () => onEdit(item.productId!),
                                },
                              ]
                            : []),
                          ...(onAdjust
                            ? [{ label: 'Adjust stock', onSelect: () => onAdjust(item.sku) }]
                            : []),
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        ) : (
          <div className="catalog-product-grid">
            {items.map((item) => (
              <article key={item.id} className="product-card selectable-card">
                <div className="product-art" aria-hidden="true">
                  <Package />
                  <span>{item.sku}</span>
                </div>
                <Button
                  variant="ghost"
                  className="product-card-title"
                  aria-label={`View ${item.name}`}
                  onClick={() => setSelected(item)}
                >
                  <strong>{item.name}</strong>
                </Button>
                <span className="text-muted-foreground">
                  {item.sku} · {item.unit}
                </span>
                <p>{item.price ? posPriceLabel({ price: item.price }) : 'Not priced'}</p>
                {onEdit && item.productId && (
                  <Button variant="ghost" onClick={() => onEdit(item.productId!)}>
                    Edit product details and pricing
                  </Button>
                )}
                <div className="product-card-summary">
                  <span>{item.available} available</span>
                  <StockBadge item={item} />
                </div>
                {onAdjust && (
                  <Button variant="outline" onClick={() => onAdjust(item.sku)}>
                    Adjust stock
                  </Button>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
      <Drawer
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DrawerContent className="product-details-drawer">
          <div className="flex items-center justify-between gap-3">
            <DrawerTitle>Product details</DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close product details"
              onClick={() => setSelected(null)}
            >
              <X />
            </Button>
          </div>
          <DrawerDescription>
            Stock information for the selected warehouse at the last refresh.
          </DrawerDescription>
          {selected && (
            <>
              <h3>{selected.name}</h3>
              <StockBadge item={selected} />
              <p>{selected.price ? posPriceLabel({ price: selected.price }) : 'Not priced'}</p>
              {onEdit && selected.productId && (
                <Button
                  onClick={() => {
                    setSelected(null);
                    onEdit(selected.productId!);
                  }}
                >
                  Edit product details and pricing
                </Button>
              )}
              <dl className="space-y-4">
                <div>
                  <dt>SKU</dt>
                  <dd>{selected.sku}</dd>
                </div>
                <div>
                  <dt>Base unit</dt>
                  <dd>{selected.unit}</dd>
                </div>
                <div>
                  <dt>Available stock</dt>
                  <dd className="text-2xl tabular-nums">{selected.available}</dd>
                </div>
              </dl>
              <p className="text-muted-foreground">
                Available stock excludes reserved, damaged and in-transit quantities.
              </p>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
