import { useRef, useState } from 'react';
import type { Product, Category } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { SidePanel } from '../ui/SidePanel';
import { Action } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { ProductForm } from './ProductForm';
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
    <SidePanel
      title={product ? 'Edit product' : 'Add product'}
      open
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
      {product && (
        <Action
          variant="ghost"
          disabled={saving}
          label="Set / adjust price"
          onPress={() => onPricing(product.id)}
        />
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
    </SidePanel>
  );
}
