import { useMemo, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import {
  productImportTemplate,
  createImportClient,
  ImportWorkflow,
  mappingIssues,
  importSourceWarning,
  mapImportSource,
} from '@inventory/api-client';
import type { Location } from '@inventory/contracts';
import { authClient } from '../auth/client';
import { operationKey } from '../platform/operation-key';
import { pickLocalFile, saveLocalText } from '../platform/files';
import { SidePanel } from '../ui/SidePanel';
import { Action, Choice } from '../ui/Controls';
import { Text } from '../ui/Themed';
import { RecordTable } from '../ui/RecordTable';
import { ExportRecords } from '../ui/ExportRecords';
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
      new ImportWorkflow(
        createImportClient(authClient.organizationRequest, businessId),
        operationKey,
      ),
    [businessId],
  );
  const state = useSyncExternalStore(model.subscribe, model.snapshot, model.snapshot);
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
      <Action
        label="Bulk import"
        onPress={() => {
          setOpen(true);
          void model.loadTemplates();
        }}
      />
      <SidePanel
        title="Import products"
        open={open}
        onClose={() => {
          if (!state.busy) setOpen(false);
        }}
      >
        <Text>
          Upload → source preview → map columns → validate and review → confirm → results.
        </Text>
        {(state.step === 'upload' || state.step === 'preview') && (
          <>
            <Text>
              Create new products in Each units with selling prices before tax (0% tax) and optional
              opening stock. Existing SKUs are never overwritten. Any failed row rolls back the
              entire batch.
            </Text>
            <Text>
              Supported mappings: SKU, name, description, selling price, currency, opening quantity.
              Categories, brands, barcodes, alternative units, purchase prices, tax rules, variants
              and images are not imported. Unmapped columns are ignored.
            </Text>
          </>
        )}
        {!!state.message && <Text accessibilityLiveRegion="polite">{state.message}</Text>}
        {state.busy && (
          <Text accessibilityLiveRegion="polite">
            Processing… No product is created until you confirm the import.
          </Text>
        )}
        {(state.step === 'upload' || state.step === 'preview') && (
          <View>
            <Text>
              Choose CSV or XLSX, maximum 1 MiB, 100 data rows and 32 columns. XLSX uses the first
              worksheet, values only; formulas are rejected.
            </Text>
            <Action
              label="Choose CSV / Excel file"
              disabled={locked}
              onPress={() => void choose()}
            />
            <Action
              label="Download example file"
              disabled={locked}
              onPress={() =>
                void saveLocalText(
                  'inventory-products-template.csv',
                  productImportTemplate,
                  'text/csv',
                ).catch(() => model.notice('Template download failed. Retry.'))
              }
            />
          </View>
        )}
        {state.source && (
          <Text>
            File: {state.source.name} · {state.source.rows.length} data rows · Step: {state.step}
          </Text>
        )}
        {state.source && state.step === 'preview' && (
          <>
            <Text accessibilityRole="header">Original source data</Text>
            <Text>
              Showing the first {Math.min(20, state.source.rows.length)} rows. Validation checks all
              rows; empty cells are shown explicitly.
            </Text>
            <RecordTable
              label="Original source data"
              columns={['Source row', 'Source warning', ...state.source.headers]}
              rows={state.source.rows.slice(0, 20).map((row, index) => ({
                id: String(index),
                cells: [
                  String(index + 2),
                  importSourceWarning(state.source!, index) || '—',
                  ...row.map((cell) => cell || 'Empty'),
                ],
              }))}
            />
            <Action
              label="Continue to column mapping"
              disabled={locked}
              onPress={() => model.navigate('mapping')}
            />
          </>
        )}
        {state.step === 'mapping' && (
          <>
            <ImportMappingEditor model={model} />
            <Choice
              label="Opening stock warehouse"
              value={state.warehouseId}
              disabled={locked}
              onChange={(v) => model.edit({ warehouseId: v })}
              options={[
                { value: '', label: 'No opening stock (quantities must be zero)' },
                ...locations
                  .filter((l) => l.kind === 'warehouses' && l.state === 'active')
                  .map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
            <Action
              label="Back to source preview"
              disabled={locked}
              onPress={() => model.navigate('preview')}
            />
            <Action
              label="Validate all rows"
              disabled={
                locked || !state.source || !!mappingIssues(state.source, state.mapping).length
              }
              onPress={() => void model.validate()}
            />
          </>
        )}
        {state.step === 'review' && (
          <>
            <Text accessibilityRole="header">Validation and final review</Text>
            {state.uncertain && (
              <Text>
                The previous import may already have committed. This batch is locked; retry its
                exact request to recover the result. If access has changed, ask an administrator to
                review inventory before starting another import.
              </Text>
            )}
            {(state.validated || state.uncertain) && (
              <RecordTable
                label="Mapped product preview"
                columns={[
                  'SKU',
                  'Product name',
                  'Selling price',
                  'Currency',
                  'Opening quantity (Each)',
                ]}
                rows={mapped.map((row) => ({
                  id: row.sku,
                  cells: [row.sku, row.name, row.price, row.currency, row.quantity],
                }))}
              />
            )}
            <Text>
              {state.validated
                ? `${state.source?.rows.length ?? 0} valid rows`
                : invalid
                  ? `${(state.source?.rows.length ?? 0) - invalid} rows passed local checks; ${invalid} invalid rows`
                  : 'Server validation is incomplete.'}
            </Text>
            {!!state.errors.length && (
              <>
                <RecordTable
                  label="Import validation errors"
                  columns={['Source row', 'Product field', 'Error']}
                  rows={state.errors.map((e, i) => ({
                    id: String(i),
                    cells: [String(e.row), e.field, e.message],
                  }))}
                />
                <ExportRecords
                  label="Download errors"
                  name="product-import-errors"
                  headers={['Source row', 'Product field', 'Error']}
                  rows={state.errors.map((e) => [String(e.row), e.field, e.message])}
                />
              </>
            )}
            {state.validated && (
              <Text>
                Create {state.source?.rows.length} new products and selling prices
                {state.warehouseId ? ' with opening stock in the selected warehouse' : ''}. No
                existing records will be updated or skipped. Confirmed imports cannot be undone by
                deleting stock evidence. Validation is a snapshot; the server rechecks at commit.
              </Text>
            )}
            <Action
              label="Correct mappings and validate again"
              disabled={locked}
              onPress={() => model.navigate('mapping')}
            />
            <Action
              label={
                state.uncertain
                  ? 'Retry exact import safely'
                  : `Confirm import of ${state.source?.rows.length ?? 0} products`
              }
              disabled={state.busy || (!state.validated && !state.uncertain)}
              onPress={() => void confirm()}
            />
          </>
        )}
        {state.result && (
          <>
            <Text accessibilityRole="header">Import complete</Text>
            <Text>{state.result.created} created · 0 failed · 0 skipped · 0 updated.</Text>
            <RecordTable
              label="Imported products"
              columns={['SKU', 'Product', 'Result']}
              rows={
                state.source?.rows.map((row, i) => ({
                  id: String(i),
                  cells: [
                    row[state.source!.headers.indexOf(state.mapping.sku)] ?? '',
                    row[state.source!.headers.indexOf(state.mapping.name)] ?? '',
                    'Created',
                  ],
                })) ?? []
              }
            />
            <Action label="Import another file" onPress={() => model.reset()} />
          </>
        )}
      </SidePanel>
    </>
  );
}
