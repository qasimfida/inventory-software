import { AlertCircle } from 'lucide-react';
import { ProductListings } from './ProductListings';
import { useRef, useState } from 'react';
import type { Product, Category, Business, Location } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { FormSheet } from '@/components/common/FormSheet';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { hasPermission } from '@inventory/contracts';
import { PricingPanel } from '../pricing/PricingPanel';
import { ProductQuantity } from './ProductQuantity';
import { ProductForm } from './ProductForm';
/** Retain the draft on failed writes and prevent duplicate product submissions. */
export function ProductEditor({
  product,
  categories,
  client,
  onSaved,
  onClose,
  focusField,
  listingContext,
}: {
  product: Product | null;
  categories: Category[];
  client: ReturnType<typeof createCatalogClient>;
  onSaved: (product: Product) => void;
  onPricing: (id: string) => void;
  onClose: () => void;
  focusField?: string;
  listingContext?: {
    business: Business;
    locations: Location[];
  };
}) {
  const savingRef = useRef(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const [current, setCurrent] = useState(product);
  const [section, setSection] = useState('Details');
  const [visited, setVisited] = useState<string[]>(['Details']);
  const [pricingBusy, setPricingBusy] = useState(false);
  const locked = saving || pricingBusy;
  const sections = [
    'Details',
    ...(current && listingContext
      ? [
          'Price & units',
          ...(hasPermission(listingContext.business, 'stock.write') &&
          hasPermission(listingContext.business, 'stock.read') &&
          current.trackInventory
            ? ['Quantity']
            : []),
          'Listing availability',
        ]
      : []),
  ];
  const select = (next: string) => {
    setSection(next);
    setVisited((previous) => [...new Set([...previous, next])]);
  };
  const finish = () => {
    if (!locked) {
      if (current) onSaved(current);
      else onClose();
    }
  };
  function savedDetails(next: Product) {
    setCurrent(next);
    if (!listingContext) {
      onSaved(next);
      return;
    }
    if (!current) select('Price & units');
  }
  async function save(work: () => Promise<unknown>) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await work();
    } catch (cause) {
      setError(
        cause instanceof Error && cause.name === 'ZodError'
          ? 'Check required fields, quantities and selections.'
          : cause instanceof Error && 'status' in cause
            ? cause.message
            : 'Unable to save product. Check the fields and connection before retrying.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }
  return (
    <FormSheet
      title={product ? 'Edit product' : current ? 'Finish product setup' : 'Add product'}
      open
      onOpenChange={(open) => {
        if (!open) finish();
      }}
    >
      {error && (
        <div role="alert" className="product-error-toast">
          <div className="flex items-start gap-2">
            <AlertCircle aria-hidden="true" className="size-4 shrink-0 text-destructive" />
            <p>{error}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setError('')}>
            Dismiss error
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Details → selling price → quantity. Save each step; advanced options are optional.
      </p>
      {sections.length > 1 && (
        <Segmented
          label="Product setup"
          value={section}
          options={sections}
          disabled={locked}
          onChange={select}
        />
      )}
      {current && (
        <p role="status" className="text-sm text-muted-foreground">
          Product details saved. Price and stock changes are saved separately below.
        </p>
      )}
      <div hidden={section !== 'Details'}>
        <ProductForm
          canCreateCategory={
            !!listingContext &&
            !listingContext.business.scope?.storeId &&
            hasPermission(listingContext.business, 'products.write')
          }
          {...(focusField ? { focusField } : {})}
          key={current?.version ?? 'new'}
          product={current}
          categories={categories}
          client={client}
          busy={saving}
          run={(work) => void save(work)}
          cancel={finish}
          onSaved={savedDetails}
        />
      </div>
      {current && listingContext && (
        <>
          {visited.includes('Price & units') && (
            <div hidden={section !== 'Price & units'}>
              <PricingPanel
                simple
                business={listingContext.business}
                locations={listingContext.locations}
                productId={current.id}
                onBusyChange={setPricingBusy}
              />
            </div>
          )}
          {visited.includes('Quantity') && sections.includes('Quantity') && (
            <div hidden={section !== 'Quantity'}>
              <ProductQuantity
                {...listingContext}
                product={current}
                opening={!product}
                busy={locked}
                run={(work) => void save(work)}
              />
            </div>
          )}
          {visited.includes('Listing availability') && (
            <div hidden={section !== 'Listing availability'}>
              <ProductListings
                {...listingContext}
                product={current}
                client={client}
                busy={locked}
                run={(work) => void save(work)}
                onSaved={setCurrent}
              />
            </div>
          )}
          <Button variant="outline" disabled={locked} onClick={finish}>
            Done
          </Button>
        </>
      )}
    </FormSheet>
  );
}
