import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ResourceModel } from '@inventory/api-client';
import type { createSalesClient, PosItem } from '@inventory/api-client';
import { Text, View } from 'react-native';
import { Action, Field } from '../organization/Controls';
import { BarcodeScanner } from '../catalog/BarcodeScanner';
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
    <View>
      <Field label="POS product search" value={search} onChange={setSearch} disabled={disabled} />
      <Action
        label="Search POS products"
        disabled={disabled}
        onPress={() => setQuery({ search, code: '', offset: 0 })}
      />
      <Field label="POS barcode" value={code} onChange={setCode} disabled={disabled} />
      <Action
        label="Add scanned product"
        disabled={disabled || !code}
        onPress={() => void scan(code)}
      />
      {!disabled && <BarcodeScanner onCode={(value) => void scan(value)} />}{' '}
      {state.error && <Text accessibilityRole="alert">{state.error}</Text>}
      {state.data?.items.map((item) => (
        <Action
          key={item.id}
          label={`Add ${item.sku} · ${item.name}`}
          disabled={disabled}
          onPress={() => add(item)}
        />
      ))}
      <Action
        label="Previous products"
        disabled={disabled || !query.offset}
        onPress={() => setQuery({ ...query, offset: Math.max(0, query.offset - 25) })}
      />
      <Action
        label="More products"
        disabled={disabled || !state.data?.hasMore}
        onPress={() => setQuery({ ...query, offset: query.offset + 25 })}
      />
    </View>
  );
}
