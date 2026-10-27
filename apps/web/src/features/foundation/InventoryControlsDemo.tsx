import { SetupCard } from '@/components/common/SetupCard';
import { RowActions } from '@/components/common/RowActions';
import { Select } from '@/components/ui/FormControls';
import { LoadMore } from '@/components/common/LoadMore';
import { useState } from 'react';
import { SearchControl } from '@/components/common/SearchControl';
import { QuantityControl } from '@/components/common/QuantityControl';
import { Pagination } from '@/components/common/Pagination';
export function InventoryControlsDemo() {
  const [search, setSearch] = useState(''),
    [quantity, setQuantity] = useState('1'),
    [loaded, setLoaded] = useState(1),
    [offset, setOffset] = useState(0);
  return (
    <section className="space-y-4">
      <h2>Inventory controls</h2>
      <SetupCard
        title="Example setup"
        steps={[
          { id: 'one', title: 'Read component guide', path: '/dev/components', done: true },
          { id: 'two', title: 'Review examples', path: '/dev/components', done: false },
        ]}
      />
      <p>Local examples; no business requests are made.</p>
      <SearchControl
        label="Find example product"
        placeholder="Search products"
        value={search}
        onChange={setSearch}
        suggestions={[{ value: 'SAMPLE-1', label: 'Example product · SAMPLE-1' }].filter((item) =>
          item.label.toLowerCase().includes(search.toLowerCase()),
        )}
      />
      <RowActions
        label="Example product"
        actions={[
          { label: 'Show local details', onSelect: () => setSearch('SAMPLE-1') },
          { label: 'Unavailable example', disabled: true, onSelect: () => {} },
        ]}
      />
      <label htmlFor="example-category">
        Example category
        <Select id="example-category" aria-label="Example category" defaultValue="all">
          <option value="all">All categories</option>
          <option value="office">Office</option>
          <option value="unavailable" disabled>
            Unavailable category
          </option>
        </Select>
      </label>
      <QuantityControl
        id="example-quantity"
        label="Example quantity"
        value={quantity}
        onChange={setQuantity}
      />
      <p aria-live="polite">Loaded {loaded} local example batches</p>
      <LoadMore
        label="local examples"
        hasMore={loaded < 3}
        onLoad={() => setLoaded((n) => n + 1)}
      />
      <Pagination
        label="example products"
        offset={offset}
        total={400}
        hasMore={offset + 25 < 400}
        onChange={setOffset}
      />
    </section>
  );
}
