import { useRef, useState } from 'react';
import { View } from 'react-native';
import { readImportFile, productImportTemplate, importProducts } from '@inventory/api-client';
import type { ImportRow, Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { pickLocalFile, saveLocalText } from '../platform/files';
import { SidePanel } from '../ui/SidePanel';
import { Action, Choice } from '../ui/Controls';
import { Text } from '../ui/Themed';
export function BulkImport({
  businessId,
  locations,
  onDone,
}: {
  businessId: string;
  locations: Location[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false),
    [rows, setRows] = useState<ImportRow[]>([]),
    [warehouseId, setWarehouse] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const key = useRef(operationKey()),
    lock = useRef(false);
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      await work();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import failed. No automatic retry was made.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Action label="Bulk import" onPress={() => setOpen(true)} />
      <SidePanel
        title="Import products and opening stock"
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <Text>
          Create new products in Each units, selling prices before tax and optional opening stock.
          Existing SKUs are never overwritten. Up to 100 rows; any failure rolls back the entire
          batch.
        </Text>
        <Action
          label="Download template"
          disabled={busy}
          onPress={() =>
            void run(() =>
              saveLocalText('inventory-products-template.csv', productImportTemplate, 'text/csv'),
            )
          }
        />
        <Action
          label="Choose CSV / Excel file"
          disabled={busy}
          onPress={() =>
            void run(async () => {
              const file = await pickLocalFile('.csv,.xlsx');
              if (file) {
                setRows(await readImportFile(file.bytes, file.name));
                key.current = operationKey();
              }
            })
          }
        />
        <Choice
          label="Opening stock warehouse"
          disabled={busy}
          value={warehouseId}
          onChange={(v) => {
            setWarehouse(v);
            key.current = operationKey();
          }}
          options={[
            { value: '', label: 'Products / prices only (zero quantity)' },
            ...locations
              .filter((l) => l.kind === 'warehouses' && l.state === 'active')
              .map((w) => ({ value: w.id, label: w.name })),
          ]}
        />
        {rows.map((r, i) => (
          <View key={i}>
            <Text>
              {r.sku} · {r.name}
            </Text>
            <Text>
              {r.currency} {r.price} · Opening quantity {r.quantity}
            </Text>
          </View>
        ))}
        {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
        <Action
          disabled={busy || !rows.length}
          label={busy ? 'Importing…' : `Confirm import of ${rows.length} products`}
          onPress={() =>
            void run(async () => {
              const result = await importProducts(authClient.organizationRequest, businessId, {
                warehouseId: warehouseId || null,
                rows,
                idempotencyKey: key.current,
              });
              setMessage(`${result.created} products imported successfully.`);
              setRows([]);
              onDone();
            })
          }
        />
      </SidePanel>
    </>
  );
}
