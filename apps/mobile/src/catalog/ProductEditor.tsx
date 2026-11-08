import { ProductListings } from './ProductListings';
import { useRef, useState } from 'react';
import type { Product, Category, Business, Location } from '@inventory/contracts';
import type { createCatalogClient } from '@inventory/api-client';
import { SidePanel } from '../ui/SidePanel';
import { View } from 'react-native';
import { Text } from '../ui/Themed';
import { Action, Choice } from '../ui/Controls';
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
    <SidePanel
      title={product ? 'Edit product' : current ? 'Finish product setup' : 'Add product'}
      open
      onClose={finish}
      footer={
        error ? (
          <View accessibilityLiveRegion="assertive">
            <Text accessibilityRole="alert" tone="error">
              {error}
            </Text>
            <Action label="Dismiss error" onPress={() => setError('')} />
          </View>
        ) : undefined
      }
    >
      <Text tone="muted">
        Details → selling price → quantity. Save each step; advanced options are optional.
      </Text>
      {sections.length > 1 && (
        <View pointerEvents={locked ? 'none' : 'auto'}>
          <Choice
            label="Product setup"
            value={section}
            options={sections.map((value) => ({ value, label: value }))}
            onChange={select}
          />
        </View>
      )}
      {current && (
        <Text accessibilityLiveRegion="polite" tone="muted">
          Product details saved. Price and stock changes are saved separately below.
        </Text>
      )}
      <View
        style={{ display: section === 'Details' ? 'flex' : 'none' }}
        accessibilityElementsHidden={section !== 'Details'}
      >
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
      </View>
      {current && listingContext && (
        <>
          {visited.includes('Price & units') && (
            <View
              style={{ display: section === 'Price & units' ? 'flex' : 'none' }}
              accessibilityElementsHidden={section !== 'Price & units'}
            >
              <PricingPanel
                simple
                business={listingContext.business}
                locations={listingContext.locations}
                productId={current.id}
                onBusyChange={setPricingBusy}
              />
            </View>
          )}
          {visited.includes('Quantity') && sections.includes('Quantity') && (
            <View
              style={{ display: section === 'Quantity' ? 'flex' : 'none' }}
              accessibilityElementsHidden={section !== 'Quantity'}
            >
              <ProductQuantity
                {...listingContext}
                product={current}
                opening={!product}
                busy={locked}
                run={(work) => void save(work)}
              />
            </View>
          )}
          {visited.includes('Listing availability') && (
            <View
              style={{ display: section === 'Listing availability' ? 'flex' : 'none' }}
              accessibilityElementsHidden={section !== 'Listing availability'}
            >
              <ProductListings
                {...listingContext}
                product={current}
                client={client}
                busy={locked}
                run={(work) => void save(work)}
                onSaved={setCurrent}
              />
            </View>
          )}
          <Action label="Done" disabled={locked} onPress={finish} />
        </>
      )}
    </SidePanel>
  );
}
