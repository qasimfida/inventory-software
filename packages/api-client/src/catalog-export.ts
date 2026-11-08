import type { Product } from '@inventory/contracts';
/** Export the records actually shown, preserving exact prices and preventing spreadsheet formulas. */
export function catalogCsv(items: readonly Product[]) {
  const rows = [
    ['Name', 'SKU', 'Status', 'Price', 'Currency', 'Unit'],
    ...items.map((p) => [
      p.name,
      p.sku,
      p.state,
      p.price?.unitPrice ?? '',
      p.price?.currency ?? '',
      p.price?.unit ?? '',
    ]),
  ];
  return recordsCsv(rows[0]!, rows.slice(1));
}

/** Bounded export of already-authorized visible records; protects spreadsheet formula cells. */
export function recordsCsv(headers: readonly string[], rows: readonly (readonly string[])[]) {
  const cell = (value: string) =>
    `"${(/^[\s]*[=+\-@]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
  return [headers, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}
