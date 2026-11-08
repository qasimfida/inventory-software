import { useMemo, useState, useSyncExternalStore } from 'react';
import { Upload, Download } from 'lucide-react';
import {
  productImportTemplate,
  createImportClient,
  ImportWorkflow,
  mappingIssues,
  importSourceWarning,
  mapImportSource,
} from '@inventory/api-client';
import type { Location } from '@inventory/contracts';
import { authClient } from '@/platform/auth-client';
import { pickLocalFile, saveLocalText } from '@/platform/files';
import { FormSheet } from '@/components/common/FormSheet';
import { ExportRecords } from '@/components/common/ExportRecords';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/FormControls';
import { Table, TableScroll } from '@/components/ui/Table';
import { ImportMappingEditor } from './ImportMappingEditor';
export function BulkImport({
  businessId,
  locations,
  onDone,
}: {
  businessId: string;
  locations: Location[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const model = useMemo(
    () =>
      new ImportWorkflow(createImportClient(authClient.organizationRequest, businessId), () =>
        crypto.randomUUID(),
      ),
    [businessId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot);
  const locked = state.busy || state.uncertain;
  async function choose() {
    try {
      const file = await pickLocalFile('.csv,.xlsx');
      if (file) await model.load(file.bytes, file.name);
    } catch (e) {
      model.notice(
        e instanceof Error ? e.message : 'Unable to read the file. Choose it again to retry.',
      );
    }
  }
  async function confirm() {
    await model.confirm();
    if (model.snapshot().result) onDone();
  }
  const invalid = new Set(state.errors.map((e) => e.row)).size;
  const mapped = state.source
    ? mapImportSource(state.source, state.mapping, state.warehouseId).rows
    : [];
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setOpen(true);
          void model.loadTemplates();
        }}
      >
        <Upload aria-hidden="true" />
        Bulk import
      </Button>
      <FormSheet
        title="Import products"
        description="Preview and validate your file before creating any products."
        open={open}
        onOpenChange={(v) => {
          if (!state.busy) setOpen(v);
        }}
      >
        <p>
          {
            {
              upload: 'Step 1 of 5 · Choose a file',
              preview: 'Step 2 of 5 · Review source data',
              mapping: 'Step 3 of 5 · Map columns',
              review: 'Step 4 of 5 · Validate and confirm',
              result: 'Step 5 of 5 · Import results',
            }[state.step]
          }
        </p>
        {(state.step === 'upload' || state.step === 'preview') && (
          <>
            <p>
              Create new products in Each units with selling prices before tax (0% tax) and optional
              opening stock. Existing SKUs are never overwritten. Any failed row rolls back the
              entire batch.
            </p>
            <p>
              Supported mappings: SKU, name, description, selling price, currency, opening quantity.
              Categories, brands, barcodes, alternative units, purchase prices, tax rules, variants
              and images are not imported. Unmapped columns are ignored.
            </p>
          </>
        )}
        {state.message && <p role="status">{state.message}</p>}
        {state.busy && (
          <p role="status">Processing… No product is created until you confirm the import.</p>
        )}
        {(state.step === 'upload' || state.step === 'preview') && (
          <div
            className="space-y-2 rounded-md border border-dashed border-border p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (locked) return;
              const files = e.dataTransfer.files;
              if (files.length !== 1) {
                model.notice('Drop exactly one CSV or XLSX file.');
                return;
              }
              const file = files[0]!;
              if (file.size > 1024 * 1024) {
                model.notice('File must be no larger than 1 MiB.');
                return;
              }
              void file
                .arrayBuffer()
                .then((bytes) => model.load(new Uint8Array(bytes), file.name))
                .catch(() => model.notice('Unable to read the dropped file. Try the file picker.'));
            }}
          >
            <p>
              Drop one CSV or XLSX file here, or choose a file. Maximum 1 MiB, 100 data rows and 32
              columns. XLSX: first worksheet, values only; formulas are rejected.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={locked} onClick={() => void choose()}>
                <Upload aria-hidden="true" />
                Choose CSV / Excel file
              </Button>
              <Button
                variant="outline"
                disabled={locked}
                onClick={() =>
                  void saveLocalText(
                    'inventory-products-template.csv',
                    productImportTemplate,
                    'text/csv',
                  ).catch(() => model.notice('Template download failed. Retry.'))
                }
              >
                <Download aria-hidden="true" />
                Download example file
              </Button>
            </div>
          </div>
        )}
        {state.source && (
          <p>
            File: {state.source.name} · {state.source.rows.length} data rows · Step: {state.step}
          </p>
        )}
        {state.source && state.step === 'preview' && (
          <>
            <h3>Original source data</h3>
            <p>
              Showing the first {Math.min(20, state.source.rows.length)} rows. Validation checks all
              rows. Empty cells are shown explicitly.
            </p>
            <TableScroll label="Original source data">
              <Table>
                <thead>
                  <tr>
                    <th>Source row</th>
                    <th>Source warning</th>
                    {state.source.headers.map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.source.rows.slice(0, 20).map((row, index) => (
                    <tr key={index}>
                      <th scope="row">{index + 2}</th>
                      <td>{importSourceWarning(state.source!, index) || '—'}</td>
                      {state.source!.headers.map((h, col) => (
                        <td key={h}>{row[col] || 'Empty'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <Button disabled={locked} onClick={() => model.navigate('mapping')}>
              Continue to column mapping
            </Button>
          </>
        )}
        {state.step === 'mapping' && (
          <>
            <ImportMappingEditor model={model} />
            <label htmlFor="import-warehouse">Opening stock warehouse</label>
            <Select
              id="import-warehouse"
              value={state.warehouseId}
              disabled={locked}
              onChange={(e) => model.edit({ warehouseId: e.target.value })}
            >
              <option value="">No opening stock (quantities must be zero)</option>
              {locations
                .filter((l) => l.kind === 'warehouses' && l.state === 'active')
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </Select>
            <div className="drawer-actions">
              <Button variant="outline" disabled={locked} onClick={() => model.navigate('preview')}>
                Back to source preview
              </Button>
              <Button
                disabled={
                  locked || !state.source || !!mappingIssues(state.source, state.mapping).length
                }
                onClick={() => void model.validate()}
              >
                Validate all rows
              </Button>
            </div>
          </>
        )}
        {state.step === 'review' && (
          <>
            <h3>Validation and final review</h3>
            {state.uncertain && (
              <p>
                The previous import may already have committed. This batch is locked; retry its
                exact request to recover the result. If access has changed, ask an administrator to
                review inventory before starting another import.
              </p>
            )}
            {(state.validated || state.uncertain) && (
              <TableScroll label="Mapped product preview">
                <Table>
                  <thead>
                    <tr>
                      {[
                        'SKU',
                        'Product name',
                        'Selling price',
                        'Currency',
                        'Opening quantity (Each)',
                      ].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mapped.map((row) => (
                      <tr key={row.sku}>
                        <th scope="row">{row.sku}</th>
                        <td>{row.name}</td>
                        <td data-numeric>{row.price}</td>
                        <td>{row.currency}</td>
                        <td data-numeric>{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableScroll>
            )}
            <p>
              {state.validated
                ? `${state.source?.rows.length ?? 0} valid rows`
                : invalid
                  ? `${(state.source?.rows.length ?? 0) - invalid} rows passed local checks; ${invalid} invalid rows`
                  : 'Server validation is incomplete.'}
            </p>
            {!!state.errors.length && (
              <>
                <TableScroll label="Import validation errors">
                  <Table>
                    <thead>
                      <tr>
                        <th>Source row</th>
                        <th>Product field</th>
                        <th>Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {state.errors.map((error, i) => (
                        <tr key={i}>
                          <th scope="row">{error.row}</th>
                          <td>{error.field}</td>
                          <td>{error.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableScroll>
                <ExportRecords
                  label="Download errors"
                  name="product-import-errors"
                  headers={['Source row', 'Product field', 'Error']}
                  rows={state.errors.map((e) => [String(e.row), e.field, e.message])}
                />
              </>
            )}
            {state.validated && (
              <p>
                Create {state.source?.rows.length} new products and selling prices
                {state.warehouseId ? ' with opening stock in the selected warehouse' : ''}. No
                existing records will be updated or skipped. Confirmed imports cannot be undone by
                deleting stock evidence. Validation is a snapshot; the server rechecks at commit.
              </p>
            )}
            <div className="drawer-actions">
              <Button variant="outline" disabled={locked} onClick={() => model.navigate('mapping')}>
                Correct mappings and validate again
              </Button>
              <Button
                disabled={state.busy || (!state.validated && !state.uncertain)}
                onClick={() => void confirm()}
              >
                {state.uncertain
                  ? 'Retry exact import safely'
                  : `Confirm import of ${state.source?.rows.length ?? 0} products`}
              </Button>
            </div>
          </>
        )}
        {state.result && (
          <>
            <h3>Import complete</h3>
            <p>{state.result.created} created · 0 failed · 0 skipped · 0 updated.</p>
            <TableScroll label="Imported products">
              <Table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {state.source?.rows.map((row, i) => (
                    <tr key={i}>
                      <th scope="row">{row[state.source!.headers.indexOf(state.mapping.sku)]}</th>
                      <td>
                        <a
                          href={`#/catalog/${state.result!.products[i]}`}
                          onClick={() => setOpen(false)}
                        >
                          {row[state.source!.headers.indexOf(state.mapping.name)]}
                        </a>
                      </td>
                      <td>Created</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
            <Button onClick={() => model.reset()}>Import another file</Button>
          </>
        )}
      </FormSheet>
    </>
  );
}
