import type { StockStatus } from '@inventory/contracts';
export const stockViews: { status: StockStatus; label: string; description: string }[] = [
  { status: 'all', label: 'Total products', description: 'Active inventory SKUs' },
  { status: 'in-stock', label: 'In stock', description: 'Above the low-stock threshold' },
  { status: 'low-stock', label: 'Low stock', description: 'Available, needs replenishment' },
  { status: 'out-of-stock', label: 'Out of stock', description: 'No available units' },
];
/** Unknown totals stay unknown; only known page links are exposed. */
export function paginationPages(page: number, last: number): (number | 'gap')[] {
  const numbers = Array.from(new Set([1, last, page - 1, page, page + 1]))
    .filter((n) => n >= 1 && n <= last)
    .sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  numbers.forEach((n, i) => {
    if (i && n - numbers[i - 1]! > 1) result.push('gap');
    result.push(n);
  });
  return result;
}
