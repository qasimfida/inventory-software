import { useRef, useState } from 'react';
import type { Product, Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { FormSheet } from '@/components/common/FormSheet';
import { Button } from '@/components/ui/Button';
import { ProductForm } from './ProductForm';
/** Retain the draft on failed writes and prevent duplicate product submissions. */
export function ProductEditor({
  product,
  categories,
  client,
  onSaved,
  onPricing,
  onClose,
}: {
  product: Product | null;
  categories: Category[];
  client: ReturnType<typeof createCatalogClient>;
  onSaved: (product: Product) => void;
  onPricing: (id: string) => void;
  onClose: () => void;
}) {
  const savingRef = useRef(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  async function save(work: () => Promise<unknown>) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    try {
      await work();
    } catch (cause) {
      setError(
        cause instanceof Error && 'status' in cause
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
      title={product ? 'Edit product' : 'Add product'}
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      {error && <p role="alert">{error}</p>}
      {product && (
        <Button variant="outline" disabled={saving} onClick={() => onPricing(product.id)}>
          Set / adjust price
        </Button>
      )}
      <ProductForm
        product={product}
        categories={categories}
        client={client}
        busy={saving}
        run={(work) => void save(work)}
        cancel={onClose}
        onSaved={onSaved}
      />
    </FormSheet>
  );
}
