import { useState } from 'react';
import { Package } from 'lucide-react';
import type { Product } from '@inventory/contracts';
export function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-muted">
      {product.images[0] && !failed ? (
        <img
          src={product.images[0]}
          alt={product.name}
          className="size-full object-contain"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Package aria-hidden="true" className="size-12 stroke-1" />
          <span className="text-xs">No image available</span>
        </div>
      )}
    </div>
  );
}
