import { strFromU8 } from 'fflate';
export const decodeUtf8 = (bytes: Uint8Array): string => strFromU8(bytes);
import { importRowSchema } from '@inventory/contracts';
import type { ImportRow } from '@inventory/contracts';
export const importHeaders = [
  'sku',
  'name',
  'description',
  'price',
  'currency',
  'quantity',
] as const;
export const productImportTemplate =
  importHeaders.join(',') + '\r\nSAMPLE-001,Sample product,Replace this row,12.50,USD,0\r\n';
/** Strict RFC-style CSV parser; quoted commas/newlines and escaped quotes are supported. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [],
    row: string[] = [];
  let value = '',
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          value += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else value += c;
      continue;
    }
    if (c === '"' && !value && !closed) {
      quoted = true;
      continue;
    }
    if (c === ',' || c === '\n' || c === '\r') {
      row.push(value);
      value = '';
      closed = false;
      if (c !== ',') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        if (row.some((v) => v !== '')) rows.push([...row]);
        row.length = 0;
      }
    } else {
      if (closed || c === '"') throw new Error('Malformed quoted CSV value.');
      value += c;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted value.');
  row.push(value);
  if (row.some((v) => v !== '')) rows.push(row);
  return rows;
}
export function validateImportRows(rows: string[][]): ImportRow[] {
  if (rows.length < 2 || rows.length > 101)
    throw new Error('Choose a file with a header and 1–100 product rows.');
  if (rows[0]?.join(',') !== importHeaders.join(','))
    throw new Error('Use the template columns in their original order.');
  return rows.slice(1).map((row, i) => {
    if (row.length !== importHeaders.length) throw new Error(`Row ${i + 2}: expected six columns.`);
    const parsed = importRowSchema.safeParse(
      Object.fromEntries(importHeaders.map((key, index) => [key, row[index]])),
    );
    if (!parsed.success)
      throw new Error(
        `Row ${i + 2}: ${parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')}`,
      );
    return parsed.data;
  });
}
export async function readImportFile(bytes: Uint8Array, name: string): Promise<ImportRow[]> {
  if (bytes.length > 1024 * 1024) throw new Error('Import file must be no larger than 1 MiB.');
  const rows = name.toLowerCase().endsWith('.csv')
    ? parseCsv(strFromU8(bytes))
    : await (await import('./import-xlsx.js')).xlsxRows(bytes);
  return validateImportRows(rows);
}
