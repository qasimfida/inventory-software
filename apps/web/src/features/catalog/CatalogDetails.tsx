import { useDisplayMoney } from '@/theme/useDisplayMoney';
import { RecordDetails } from '@/components/common/RecordDetails';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { RichDescription } from '@/components/common/RichDescription';

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
  const { posPriceLabel } = useDisplayMoney();

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
          <div className="max-w-sm">
            <ProductImage product={product} />
          </div>
          <h3>{product.name}</h3>
          <a className="text-primary underline" href={`#/catalog/${product.id}`} onClick={onClose}>
            Open full product details
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <span>{product.sku}</span>
            <StatusBadge tone={product.state === 'active' ? 'success' : 'neutral'}>
              {product.state}
            </StatusBadge>
          </div>
          <p className="text-lg tabular-nums">
            {product.price ? posPriceLabel({ price: product.price }) : 'Not priced'}
          </p>
          {onEdit && product.state !== 'archived' && (
            <Button onClick={() => onEdit(product)}>Edit product details and pricing</Button>
          )}
          <h4>Description</h4>
          <RichDescription value={product.description} />
          <RecordDetails
            label="Product information"
            items={[
              { label: 'Product type', value: product.type },
              {
                label: 'Inventory tracking',
                value: product.trackInventory ? 'Enabled' : 'Disabled',
              },
              { label: 'Barcodes', value: product.barcodes.join(', ') || 'None' },
              { label: 'Alternative codes', value: product.alternativeCodes.join(', ') || 'None' },
            ]}
          />
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
