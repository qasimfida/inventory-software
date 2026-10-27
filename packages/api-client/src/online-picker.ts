import type { OnlinePickerQuery, OnlineProductPreview } from '@inventory/contracts';
import type { OnlineClient } from './online-products.js';
/** Explicit user-requested selection, capped before fetching remaining result pages. */
export async function selectOnlineResults(client: OnlineClient, q: Partial<OnlinePickerQuery>) {
  const first = await client.products({ ...q, offset: 0, limit: 50 });
  if (first.total > 200)
    throw new Error(
      'More than 200 products match. Narrow the search before selecting all results.',
    );
  const items = [...first.items];
  while (items.length < first.total) {
    const page = await client.products({ ...q, offset: items.length, limit: 50 });
    if (!page.items.length) break;
    items.push(...page.items);
    if (items.length > 200) throw new Error('Results changed. Narrow the search and retry.');
  }
  return new Map(
    items.filter((p) => !p.listingId && p.source.state === 'active').map((p) => [p.productId, p]),
  );
}
export function candidateLabel(p: OnlineProductPreview) {
  return p.listingId
    ? 'Listed'
    : p.source.state !== 'active'
      ? 'Cannot be listed: inactive/archived'
      : p.issues.some((i) => i.severity === 'error')
        ? `Needs changes: ${p.issues.filter((i) => i.severity === 'error').length} issues`
        : 'Ready';
}
