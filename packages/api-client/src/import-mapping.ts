import { importMappingSchema, importRowSchema } from '@inventory/contracts';
import type { ImportMapping, ImportRow, ImportIssue } from '@inventory/contracts';
import { parseCsv, decodeUtf8, importHeaders } from './import-file.js';
export interface ImportSource {
  name: string;
  headers: string[];
  rows: string[][];
}
export const importFields = [
  { key: 'sku', label: 'SKU', required: true },
  { key: 'name', label: 'Product name', required: true },
  { key: 'description', label: 'Description', required: false },
  { key: 'price', label: 'Selling price (before tax)', required: true },
  { key: 'currency', label: 'Currency code', required: true },
  { key: 'quantity', label: 'Opening stock (Each)', required: false },
] as const;
export async function readImportSource(bytes: Uint8Array, name: string): Promise<ImportSource> {
  if (bytes.length > 1024 * 1024) throw new Error('File must be no larger than 1 MiB.');
  if (!/\.(csv|xlsx)$/i.test(name)) throw new Error('Choose a CSV or XLSX file.');
  const table = /\.csv$/i.test(name)
    ? parseCsv(decodeUtf8(bytes), true)
    : await (await import('./import-xlsx.js')).xlsxRows(bytes, 32);
  if (table.length < 2 || table.length > 101)
    throw new Error('Use a header and 1–100 data rows; remove blank rows before importing.');
  const headers = table[0]!.map((h) => h.trim());
  if (
    !headers.length ||
    headers.length > 32 ||
    headers.some((h) => !h || h.length > 120) ||
    new Set(headers).size !== headers.length
  )
    throw new Error('Use 1–32 unique, nonempty column headers, at most 120 characters each.');
  const rows = table.slice(1).map((row, i) => {
    if (row.length > headers.length)
      throw new Error(`Source row ${i + 2} has more cells than headers.`);
    if (row.some((cell) => cell.length > 2000))
      throw new Error(`Source row ${i + 2} contains a cell longer than 2,000 characters.`);
    return headers.map((header, index) => {
      void header;
      return row[index] ?? '';
    });
  });
  return { name, headers, rows };
}
export function suggestedImportMapping(source: ImportSource): ImportMapping {
  return Object.fromEntries(
    importHeaders.map((key) => [key, source.headers.find((h) => h.toLowerCase() === key) ?? '']),
  ) as ImportMapping;
}
export function mappingIssues(source: ImportSource, mapping: ImportMapping): string[] {
  const issues: string[] = [];
  for (const field of importFields) {
    const column = mapping[field.key];
    if (!column && field.required) issues.push(`Choose a source column for ${field.label}.`);
    else if (column && !source.headers.includes(column))
      issues.push(`${field.label}: source column “${column}” is missing.`);
  }
  const columns = Object.values(mapping).filter(Boolean);
  if (new Set(columns).size !== columns.length)
    issues.push('Each source column can map to only one product field.');
  if (!issues.length && !importMappingSchema.safeParse(mapping).success)
    issues.push('Review the column mappings; a source header may be too long.');
  return issues;
}
export function mapImportSource(source: ImportSource, mapping: ImportMapping, warehouseId: string) {
  const errors: ImportIssue[] = [];
  const rows: ImportRow[] = [];
  const skus = new Map<string, number[]>();
  for (const [index, row] of source.rows.entries()) {
    const raw = Object.fromEntries(
      importHeaders.map((field) => [
        field,
        mapping[field]
          ? (row[source.headers.indexOf(mapping[field])] ?? '')
          : field === 'quantity'
            ? '0'
            : '',
      ]),
    );
    for (const field of ['sku', 'name', 'price', 'currency', 'quantity'])
      raw[field] = raw[field]!.trim();
    const sku = raw.sku!.toUpperCase();
    if (sku) skus.set(sku, [...(skus.get(sku) ?? []), index + 2]);
    const parsed = importRowSchema.safeParse(raw);
    if (!parsed.success)
      for (const issue of parsed.error.issues)
        errors.push({
          row: index + 2,
          field: issue.path.join('.'),
          message:
            (
              {
                sku: 'Use a unique SKU, up to 64 letters, numbers or . _ : / -; start with a letter or number.',
                name: 'Enter a product name between 1 and 120 characters.',
                description: 'Keep the description within 2,000 characters.',
                price:
                  'Enter a non-negative price with up to six decimal places, without currency symbols or separators.',
                quantity: 'Enter a non-negative opening quantity with up to six decimal places.',
                currency: 'Use a supported currency code: USD, EUR, GBP, PKR, JPY, KWD or CLF.',
              } as Record<string, string>
            )[String(issue.path[0])] ?? issue.message,
        });
    else {
      rows.push(parsed.data);
      if (!warehouseId && !/^0(?:\.0+)?$/.test(parsed.data.quantity))
        errors.push({
          row: index + 2,
          field: 'quantity',
          message: 'Select a warehouse for opening stock.',
        });
    }
  }
  for (const duplicates of skus.values())
    if (duplicates.length > 1)
      for (const row of duplicates)
        errors.push({
          row,
          field: 'sku',
          message: `Duplicate SKU in source rows ${duplicates.join(', ')}.`,
        });
  return { rows, errors };
}

/** Source-level warning only; SKU duplicates are validated after explicit mapping. */
export function importSourceWarning(source: ImportSource, index: number): string {
  const row = source.rows[index]!;
  if (row.every((cell) => !cell.trim())) return 'Empty row — remove it before importing.';
  const first = source.rows.findIndex(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(row),
  );
  return first < index
    ? `Looks identical to source row ${first + 2}; review before importing.`
    : '';
}
