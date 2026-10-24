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
                  <th scope="row">{name(product)}</th>
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
