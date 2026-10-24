import type { Product } from '@inventory/contracts';
/** Export the records actually shown, preserving exact prices and preventing spreadsheet formulas. */
export function catalogCsv(items: readonly Product[]) {
  const cell = (value: string) =>
    `"${(/^[\s]*[=+\-@]/.test(value) ? `'${value}` : value).replaceAll('"', '""')}"`;
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
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}
