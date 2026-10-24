import { useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { readImportFile, productImportTemplate, importProducts } from '@inventory/api-client';
import type { ImportRow, Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { pickLocalFile, saveLocalText } from '@/platform/files';
import { FormSheet } from '@/components/common/FormSheet';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
import { Table, TableScroll } from '@/components/ui/Table';
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
  const key = useRef(crypto.randomUUID()),
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
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload />
        Bulk import
      </Button>
      <FormSheet
        title="Import products and opening stock"
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <p>
          Create new products with base unit Each, selling prices before tax and optional opening
          stock. Existing SKUs are never overwritten. Up to 100 rows per file; the entire batch is
          rolled back if any row fails.
        </p>
        <div className="flex gap-2">
          <Button
            disabled={busy}
            variant="outline"
            onClick={() =>
              void run(() =>
                saveLocalText('inventory-products-template.csv', productImportTemplate, 'text/csv'),
              )
            }
          >
            <Download />
            Download template
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const file = await pickLocalFile('.csv,.xlsx');
                if (file) {
                  const parsed = await readImportFile(file.bytes, file.name);
                  setRows(parsed);
                  key.current = crypto.randomUUID();
                }
              })
            }
          >
            <Upload />
            Choose CSV / Excel file
          </Button>
        </div>
        <label htmlFor="import-warehouse">Opening stock warehouse</label>
        <Select
          id="import-warehouse"
          disabled={busy}
          value={warehouseId}
          onChange={(e) => {
            setWarehouse(e.target.value);
            key.current = crypto.randomUUID();
          }}
        >
          <option value="">Products and prices only (zero quantity)</option>
          {locations
            .filter((l) => l.kind === 'warehouses' && l.state === 'active')
            .map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
        </Select>
        {!!rows.length && (
          <TableScroll label="Import preview">
            <Table>
              <thead>
                <tr>
                  {['SKU', 'Product', 'Price', 'Currency', 'Opening stock'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.sku}</td>
                    <th scope="row">{r.name}</th>
                    <td data-numeric>{r.price}</td>
                    <td>{r.currency}</td>
                    <td data-numeric>{r.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
        {message && <p role="status">{message}</p>}
        <Button
          disabled={busy || !rows.length}
          onClick={() =>
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
        >
          {busy ? 'Importing…' : `Confirm import of ${rows.length} products`}
        </Button>
      </FormSheet>
    </>
  );
}
