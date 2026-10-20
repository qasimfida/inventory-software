import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ResourceModel } from '@inventory/api-client';
import type { createSalesClient, PosItem } from '@inventory/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/FormControls';
export function ProductPicker({
  client,
  warehouseId,
  add,
  disabled,
}: {
  client: ReturnType<typeof createSalesClient>;
  warehouseId: string;
  add: (item: PosItem) => void;
  disabled: boolean;
}) {
  const [search, setSearch] = useState(''),
    [code, setCode] = useState(''),
    [query, setQuery] = useState({ search: '', code: '', offset: 0 });
  const model = useMemo(
    () => new ResourceModel(() => client.items({ warehouseId, ...query })),
    [client, warehouseId, query],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
  useEffect(() => {
    void model.run();
    return model.reset;
  }, [model]);
  async function scan(value: string) {
    await model.run(async () => {
      const found = await client.items({ warehouseId, code: value });
      if (found.items.length === 1) {
        add(found.items[0]!);
        setCode('');
      } else setQuery({ search: '', code: value, offset: 0 });
    });
  }
  return (
    <div className="space-y-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery({ search, code: '', offset: 0 });
        }}
      >
        <label htmlFor="pos-search">POS product search</label>
        <Input
          id="pos-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
        />
        <Button type="submit" disabled={disabled}>
          Search POS products
        </Button>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (code) void scan(code);
        }}
      >
        <label htmlFor="pos-barcode">POS barcode</label>
        <Input
          id="pos-barcode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={disabled}
          autoComplete="off"
        />
        <Button type="submit" disabled={disabled || !code}>
          Add scanned product
        </Button>
      </form>
      {state.error && <p role="alert">{state.error}</p>}
      <ul>
        {state.data?.items.map((item) => (
          <li key={item.id}>
            <Button disabled={disabled} onClick={() => add(item)}>
              Add {item.sku} · {item.name}
            </Button>
          </li>
        ))}
      </ul>
      <Button
        disabled={disabled || !query.offset}
        onClick={() => setQuery({ ...query, offset: Math.max(0, query.offset - 25) })}
      >
        Previous products
      </Button>
      <Button
        disabled={disabled || !state.data?.hasMore}
        onClick={() => setQuery({ ...query, offset: query.offset + 25 })}
      >
        More products
      </Button>
    </div>
  );
}
