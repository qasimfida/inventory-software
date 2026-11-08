import { Check, X, Info, Package } from 'lucide-react';
import { useState } from 'react';
import type { SkuFeedback } from '@inventory/api-client';
import {
  Hint,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/Tooltip';
/** Local form feedback: previews are a permission-filtered projection, never another tenant's record. */
export function SkuStatusIcon({ feedback }: { feedback: SkuFeedback | null }) {
  if (!feedback || !['available', 'duplicate'].includes(feedback.state)) return null;
  const available = feedback.state === 'available';
  const label = available ? 'SKU ID is available.' : 'SKU ID already exists.';
  return (
    <span className="absolute inset-y-0 right-1 flex items-center">
      <Hint label={label}>
        <button
          type="button"
          aria-label={label}
          className={`inline-flex size-8 items-center justify-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${available ? 'text-success' : 'text-destructive'}`}
        >
          {available ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <X className="size-4" aria-hidden="true" />
          )}
        </button>
      </Hint>
    </span>
  );
}
export function SkuProductHint({ feedback }: { feedback: SkuFeedback | null }) {
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState(false);
  if (feedback?.state !== 'duplicate') return null;
  const product = feedback.product;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="View existing SKU product"
            onClick={() => setOpen(true)}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md align-middle text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <Info aria-hidden="true" className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-64">
          {product ? (
            <div className="flex items-center gap-2">
              {product.image && !failedImage ? (
                <img
                  src={product.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="size-10 shrink-0 rounded-md object-contain bg-muted"
                  onError={() => setFailedImage(true)}
                />
              ) : (
                <Package className="size-8 shrink-0" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="font-medium break-words">{product.name}</p>
                <p className="text-xs break-all">SKU: {product.sku}</p>
                <p className="text-xs">Already uses this SKU or product code.</p>
              </div>
            </div>
          ) : (
            <p>Product details are unavailable for your access level. Choose a different SKU.</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
