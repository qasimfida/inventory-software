import { evaluateStorefrontReadiness, revalidatedListingStatus } from '@inventory/contracts';
import { mockOnlinePreview } from './storefront-product-reads.js';
import type { storefrontManagementSeed } from './storefront-seed.js';
import type { DemoSeed } from './seed.js';
const revisions = new WeakMap<object, Map<string, number>>();
/** Demo counterpart of committed catalog revisions; never changes inventory or financial data. */
export function revalidateDemoCatalog(
  seed: DemoSeed,
  data: ReturnType<typeof storefrontManagementSeed>,
) {
  let seen = revisions.get(data);
  if (!seen) {
    seen = new Map();
    revisions.set(data, seen);
  }
  for (const item of data.items) {
    const version = seed.products.find((p) => p.id === item.productId)?.version ?? 1;
    if (version <= (seen.get(item.id) ?? 1)) continue;
    seen.set(item.id, version);
    const from = item.status;
    const result = evaluateStorefrontReadiness(
      mockOnlinePreview(seed, data.settings, item.productId, item).source,
    );
    item.issues = result.issues;
    item.status = revalidatedListingStatus(item.status, result.ready, !!item.pausedAt);
    item.title =
      item.overrides.title ??
      seed.products.find((p) => p.id === item.productId)?.name ??
      item.title;
    item.version++;
    item.lastValidatedAt = new Date().toISOString();
    data.history.push({
      id: String(data.history.length + 1),
      listingId: item.id,
      actorId: null,
      transition: `${from}->${item.status}`,
      reasonCode: 'catalog_changed',
      before: { status: from },
      after: { status: item.status },
      timestamp: item.lastValidatedAt,
    });
  }
}
