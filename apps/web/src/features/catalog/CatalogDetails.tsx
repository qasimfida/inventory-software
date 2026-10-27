import { posPriceLabel } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import type { Product } from '@inventory/contracts';
import { FormSheet } from '@/components/common/FormSheet';
import { ProductImage } from './ProductImage';
export function CatalogDetails({
  product,
  onClose,
  onEdit,
}: {
  product: Product | undefined;
  onClose: () => void;
  onEdit?: ((product: Product) => void) | undefined;
}) {
  return (
    <FormSheet
      title="Product detail"
      open={!!product}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {product && (
        <>
          <ProductImage product={product} />
          <h3>{product.name}</h3>
          <a className="text-primary underline" href={`#/catalog/${product.id}`} onClick={onClose}>
            Open full product details
          </a>
          <p>
            {product.sku} · {product.state}
          </p>
          <p className="text-lg tabular-nums">
            {product.price ? posPriceLabel({ price: product.price }) : 'Not priced'}
          </p>
          {onEdit && product.state !== 'archived' && (
            <Button onClick={() => onEdit(product)}>Edit product details and pricing</Button>
          )}
          <h4>Description</h4>
          <p>{product.description || 'No description added.'}</p>
          <dl className="record-details">
            <dt>Product type</dt>
            <dd>{product.type}</dd>
            <dt>Inventory tracking</dt>
            <dd>{product.trackInventory ? 'Enabled' : 'Disabled'}</dd>
            <dt>Barcodes</dt>
            <dd>{product.barcodes.join(', ') || 'None'}</dd>
            <dt>Alternative codes</dt>
            <dd>{product.alternativeCodes.join(', ') || 'None'}</dd>
          </dl>
          {product.images.slice(1).map((url) => (
            <img
              key={url}
              src={url}
              alt={product.name}
              className="w-full rounded-lg object-contain"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ))}
        </>
      )}
    </FormSheet>
  );
}
