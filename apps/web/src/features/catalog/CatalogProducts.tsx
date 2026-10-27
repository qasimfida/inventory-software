import { OnlineCollectionFeedback } from '../storefront/OnlineCollectionFeedback';
import { Checkbox } from '@/components/ui/Checkbox';
import { useOnlineCollection } from '../storefront/useOnlineCollection';
import { posPriceLabel } from '@inventory/api-client';
import { ProductImage } from './ProductImage';
import { CatalogDetails } from './CatalogDetails';
import { useState } from 'react';
import type { Product } from '@inventory/contracts';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, TableScroll } from '@/components/ui/Table';
import { RowActions } from '@/components/common/RowActions';
import { EmptyState } from '@/components/common/AsyncState';
export function CatalogProducts({
  products,
  filtered = false,
  onCreate,
  writable,
  onPricing,
  onEdit,
  view = 'grid',
}: {
  products: Product[];
  filtered?: boolean;
  onCreate?: (() => void) | undefined;
  writable: boolean;
  onPricing: (id: string) => void;
  onEdit: (product: Product) => void;
  view?: 'list' | 'grid';
}) {
  const channels = useOnlineCollection(products.map((p) => p.id));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = products.find((p) => p.id === selectedId);
  const name = (product: Product) => (
    <Button
      variant="ghost"
      className="product-card-title"
      aria-label={`View details for ${product.name}`}
      onClick={() => setSelectedId(product.id)}
    >
      {product.name}
    </Button>
  );
  const actions = (product: Product) => (
    <RowActions
      label={product.sku}
      actions={[
        ...(channels.manage
          ? [{ label: 'Add to online store', onSelect: () => void channels.add([product.id]) }]
          : []),
        { label: 'View details', onSelect: () => setSelectedId(product.id) },
        { label: 'Variants and pricing', onSelect: () => onPricing(product.id) },
        ...(writable && product.state !== 'archived'
          ? [{ label: 'Edit product', onSelect: () => onEdit(product) }]
          : []),
      ]}
    />
  );
  if (!products.length)
    return (
      <EmptyState
        message={filtered ? 'No matching products' : 'No products yet'}
        description={
          filtered
            ? 'Try another search or clear your filters to see more products.'
            : 'Add your first product to start managing your catalog.'
        }
        action={
          writable && !filtered && onCreate
            ? { label: 'Add product', onClick: onCreate }
            : undefined
        }
      />
    );
  return (
    <>
      <OnlineCollectionFeedback channels={channels} />
      {channels.manage && channels.selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span>{channels.selected.length} selected</span>
          <Button disabled={channels.busy} onClick={() => void channels.add(channels.selected)}>
            Add to online store
          </Button>
          <Button variant="ghost" onClick={() => channels.setSelected([])}>
            Clear selection
          </Button>
        </div>
      )}
      {view === 'list' ? (
        <TableScroll label="Catalog products">
          <Table>
            <thead>
              <tr>
                {['Product', 'SKU', 'Price / base unit', 'Status', 'Actions'].map((label) => (
                  <th key={label} data-actions={label === 'Actions' || undefined}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <th scope="row">
                    <div className="flex items-center gap-2">
                      {channels.manage && (
                        <Checkbox
                          aria-label={`Select ${product.name} for online store`}
                          checked={channels.selected.includes(product.id)}
                          onCheckedChange={() => channels.toggle(product.id)}
                        />
                      )}
                      <span>
                        {name(product)}
                        {channels.items.some(
                          (l) => l.productId === product.id && l.status === 'active',
                        ) && <StatusBadge>Online</StatusBadge>}
                      </span>
                    </div>
                  </th>
                  <td>{product.sku}</td>
                  <td className="tabular-nums">
                    {product.price ? posPriceLabel({ price: product.price }) : 'Not priced'}
                  </td>
                  <td>
                    <StatusBadge tone={product.state === 'active' ? 'success' : 'neutral'}>
                      {product.state}
                    </StatusBadge>
                  </td>
                  <td data-actions>{actions(product)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableScroll>
      ) : (
        <ul className="catalog-product-grid">
          {products.map((product) => (
            <li key={product.id} className="product-card selectable-card">
              {channels.manage && (
                <Checkbox
                  aria-label={`Select ${product.name} for online store`}
                  checked={channels.selected.includes(product.id)}
                  onCheckedChange={() => channels.toggle(product.id)}
                />
              )}
              {channels.items.some((l) => l.productId === product.id && l.status === 'active') && (
                <StatusBadge>Online</StatusBadge>
              )}
              <ProductImage key={product.images[0] ?? ''} product={product} />
              <h3>{name(product)}</h3>
              <div className="product-card-summary">
                <span className="text-muted-foreground">{product.sku}</span>
                <StatusBadge tone={product.state === 'active' ? 'success' : 'neutral'}>
                  {product.state}
                </StatusBadge>
              </div>
              <p className="tabular-nums">
                {product.price ? posPriceLabel({ price: product.price }) : 'Not priced'}
              </p>
              <div className="flex flex-wrap gap-2">
                {channels.manage && (
                  <Button disabled={channels.busy} onClick={() => void channels.add([product.id])}>
                    Add to online store
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPricing(product.id)}
                  aria-label={`Variants and pricing for ${product.name}`}
                >
                  Set / view price
                </Button>
                {writable && product.state !== 'archived' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(product)}
                    aria-label={`Edit product ${product.name}`}
                  >
                    Edit product
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <CatalogDetails
        product={selected}
        onClose={() => setSelectedId(null)}
        onEdit={
          writable
            ? (p) => {
                setSelectedId(null);
                onEdit(p);
              }
            : undefined
        }
      />
    </>
  );
}
