import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { hasPermission, type Business, type Location } from '@inventory/contracts';
import { Segmented } from '@/components/ui/Segmented';
import { CatalogPanel } from '../catalog/CatalogPanel';
import { InventoryPanel } from './InventoryPanel';
/** One destination; each existing workflow retains its own permissions and commands. */
export function InventoryWorkspace({
  business,
  locations,
  initialSearch,
}: {
  business: Business;
  locations: Location[];
  initialSearch?: string | undefined;
}) {
  const [params, setParams] = useSearchParams();
  const products = hasPermission(business, 'products.read');
  const stock = hasPermission(business, 'stock.read');
  const [section, setSection] = useState('Products & pricing');
  const [previousSearch, setPreviousSearch] = useState(initialSearch);
  if (previousSearch !== initialSearch) {
    setPreviousSearch(initialSearch);
    if (initialSearch !== undefined) setSection('Products & pricing');
  }
  if (business.state !== 'active' || (!products && !stock)) return null;
  const selected =
    products && (!stock || (!params.has('stock') && section === 'Products & pricing'))
      ? 'Products & pricing'
      : 'Stock & movements';
  return (
    <section aria-label="Inventory workspace" className="screen-section">
      {products && stock && (
        <Segmented
          label="Inventory section"
          value={selected}
          options={['Products & pricing', 'Stock & movements']}
          onChange={(next) => {
            setSection(next);
            if (next === 'Products & pricing' && params.has('stock')) {
              const updated = new URLSearchParams(params);
              updated.delete('stock');
              setParams(updated);
            }
          }}
        />
      )}
      {selected === 'Products & pricing' ? (
        <CatalogPanel business={business} locations={locations} initialSearch={initialSearch} />
      ) : (
        <InventoryPanel business={business} locations={locations} />
      )}
    </section>
  );
}
