import { revalidateDemoCatalog } from './storefront-revalidate.js';
import { mockOnlinePreview } from './storefront-product-reads.js';
import {
  hasPermission,
  onlineCommandSchema,
  listingQuerySchema,
  listingTransition,
  evaluateStorefrontReadiness,
  revalidatedListingStatus,
} from '@inventory/contracts';
import type { ChannelListing } from '@inventory/contracts';
import { DemoFailure } from './account.js';
import type { DemoSeed } from './seed.js';
import { storefrontManagementSeed } from './storefront-seed.js';
import { demoState } from './state.js';
const stores = new WeakMap<DemoSeed, Map<string, ReturnType<typeof storefrontManagementSeed>>>();
export async function mockStorefrontManagement(
  seed: DemoSeed,
  resource: string,
  method: string,
  body: unknown,
  q: { get: (k: string) => string | null },
) {
  const [, storeId, , endpoint, id] = resource.split('/');
  if (!storeId || !seed.locations.some((l) => l.id === storeId && l.kind === 'stores'))
    throw new DemoFailure(404, 'Store not found.');
  if (
    !hasPermission(
      seed.business,
      method === 'GET' || endpoint === 'image-preview' ? 'onlineStore.view' : 'onlineStore.manage',
    ) ||
    demoState.scenario === 'denied'
  )
    throw new DemoFailure(403, 'Online store permission required.');
  if (seed.business.scope?.storeId && seed.business.scope.storeId !== storeId)
    throw new DemoFailure(403, 'Store access required.');
  if (demoState.scenario === 'rate-limited')
    throw new DemoFailure(429, 'Too many attempts. Try again later.');
  if (demoState.scenario === 'slow')
    await new Promise<void>((resolve) =>
      (
        globalThis as typeof globalThis & { setTimeout: (work: () => void, ms: number) => unknown }
      ).setTimeout(resolve, 1200),
    );
  let scoped = stores.get(seed);
  if (!scoped) {
    scoped = new Map();
    stores.set(seed, scoped);
  }
  let data = scoped.get(storeId);
  if (!data) {
    data = storefrontManagementSeed(seed, storeId);
    if (demoState.scenario === 'store-live' || demoState.scenario === 'store-sold-out-hidden') {
      data.settings.enabled = true;
      data.settings.status = 'live';
    }
    if (demoState.scenario === 'store-all-clear') {
      data.items = [];
      data.settings.enabled = true;
      data.settings.status = 'live';
    }
    if (demoState.scenario === 'store-disabled') data.settings.status = 'disabled';
    if (demoState.scenario === 'store-sold-out-hidden') data.settings.soldOutBehavior = 'hide';
    if (demoState.scenario === 'empty') {
      data.items = [];
      data.configured = false;
    }
    scoped.set(storeId, data);
  }
  revalidateDemoCatalog(seed, data);
  const empty = !data.configured;
  const costVisible = hasPermission(seed.business, 'purchases.read');
  const visibleIssues = (item: ChannelListing) =>
    item.issues.filter((issue) => costVisible || issue.code !== 'PRICE_BELOW_COST');
  const counts = () =>
    Object.fromEntries(
      ['selected', 'needs_changes', 'ready', 'active', 'paused'].map((s) => [
        s,
        empty ? 0 : data.items.filter((i) => i.status === s).length,
      ]),
    );
  if (method === 'GET') {
    if (endpoint === 'settings')
      return {
        settings: empty ? null : data.settings,
        defaults: { name: seed.business.name },
        prerequisites: empty ? ['Configure this store.'] : [],
      };
    if (endpoint === 'check-slug')
      return {
        available: q.get('slug') !== 'taken',
        suggestions: q.get('slug') === 'taken' ? ['taken-store'] : [],
      };
    if (endpoint === 'image-host-impact')
      return {
        host: q.get('host'),
        count: data.items.length,
        listingIds: data.items.map((i) => i.id),
      };
    if (endpoint === 'overview')
      return {
        status: empty ? 'not_configured' : data.settings.status,
        counts: counts(),
        soldOut: empty
          ? 0
          : data.items.filter((i) => i.status === 'active' && i.availability === 'SOLD_OUT').length,
        warnings: data.items.filter((i) => visibleIssues(i).some((v) => v.severity === 'warning'))
          .length,
        lastValidatedAt: new Date().toISOString(),
        asOf: new Date().toISOString(),
      };
    if (endpoint === 'products') {
      if (!hasPermission(seed.business, 'products.read'))
        throw new DemoFailure(403, 'Catalog viewing permission required.');
      const term = (q.get('search') ?? '').toLowerCase(),
        category = q.get('category'),
        offset = Number(q.get('offset') ?? 0),
        limit = Number(q.get('limit') ?? 25);
      const products = seed.products.filter(
        (p) =>
          (!category || p.categoryId === category) &&
          [p.name, p.sku, ...p.barcodes].some((v) => v.toLowerCase().includes(term)),
      );
      const previews = products.map((p) =>
        mockOnlinePreview(
          seed,
          data.settings,
          p.id,
          data.items.find((i) => i.productId === p.id),
        ),
      );
      const readiness = q.get('readiness') ?? 'all';
      const matches = previews.filter(
        (p) =>
          (q.get('inStock') !== 'true' || Number(p.quantity) > 0) &&
          (readiness === 'all' ||
            (readiness === 'inactive'
              ? p.source.state !== 'active'
              : p.source.state === 'active' &&
                (readiness === 'issues'
                  ? p.issues.some((i) => i.severity === 'error')
                  : !p.issues.some((i) => i.severity === 'error')))),
      );
      return {
        items: matches.slice(offset, offset + limit),
        total: matches.length,
        hasMore: offset + limit < matches.length,
        categories: seed.categories.map((c) => ({ id: c.id, name: c.name })),
      };
    }
    if (endpoint === 'listings' && id) {
      if (resource.endsWith('/history')) return data.history.filter((e) => e.listingId === id);
      const listing = data.items.find((i) => i.id === id);
      if (!listing) throw new DemoFailure(404, 'Listing not found.');
      const preview = mockOnlinePreview(seed, data.settings, listing.productId, listing);
      return {
        listing: { ...listing, issues: visibleIssues(listing) },
        preview: { ...preview, issues: visibleIssues(listing) },
      };
    }
    if (endpoint === 'listings' || endpoint === 'product-list') {
      const query = listingQuerySchema.parse(
        Object.fromEntries(
          [
            'status',
            'tab',
            'attention',
            'search',
            'category',
            'issue',
            'sort',
            'cursor',
            'limit',
          ].flatMap((k) => (q.get(k) === null ? [] : [[k, q.get(k)]])),
        ),
      );
      if (query.issue === 'PRICE_BELOW_COST' && !costVisible)
        throw new DemoFailure(403, 'Purchasing read permission required.');
      const offset = Number(query.cursor ?? 0);
      if (!Number.isSafeInteger(offset) || offset < 0)
        throw new DemoFailure(400, 'Invalid cursor.');
      const items = empty
        ? []
        : data.items.filter(
            (i) =>
              (!query.status || i.status === query.status) &&
              (!query.attention ||
                (query.attention === 'sold-out'
                  ? i.status === 'active' && i.availability === 'SOLD_OUT'
                  : visibleIssues(i).some((v) => v.severity === 'warning'))) &&
              (!query.tab ||
                (query.tab === 'active'
                  ? ['active', 'paused'].includes(i.status)
                  : i.status === (query.tab === 'ready' ? 'ready' : 'needs_changes'))) &&
              (!query.productIds || query.productIds.split(',').includes(i.productId)) &&
              (!query.category ||
                seed.products.find((p) => p.id === i.productId)?.categoryId === query.category) &&
              i.title.toLowerCase().includes(query.search.toLowerCase()) &&
              (!query.issue || i.issues.some((v) => v.code === query.issue)),
          );
      items.sort((a, b) =>
        query.sort === 'title' ? a.title.localeCompare(b.title) : b.version - a.version,
      );
      const page = {
        items: items
          .slice(offset, offset + query.limit)
          .map((item) => ({ ...item, issues: visibleIssues(item) })),
        counts: counts(),
        nextCursor: offset + query.limit < items.length ? String(offset + query.limit) : null,
        asOf: new Date().toISOString(),
      };
      return endpoint === 'product-list'
        ? {
            page,
            previews: Object.fromEntries(
              page.items.map((i) => [i.id, mockOnlinePreview(seed, data.settings, i.productId, i)]),
            ),
          }
        : page;
    }
  }
  if (endpoint === 'image-preview')
    return {
      status: 'not_reachable',
      message:
        'Demo mode does not fetch external images. Use the connected API to verify reachability.',
    };
  const command = onlineCommandSchema.parse(body);
  const payload = JSON.stringify(command),
    previous = data.receipts.get(command.idempotencyKey);
  if (previous) {
    if (previous.payload !== payload) throw new DemoFailure(409, 'Command key already used.');
    return previous.result;
  }
  if (demoState.scenario === 'stale')
    throw new DemoFailure(409, 'This listing changed. Review the latest version.');
  const results: Array<{ id: string; ok: boolean; code: string; version?: number }> = [];
  const history = (item: ChannelListing, from: string, reason: string) =>
    data.history.push({
      id: String(data.history.length + 1),
      listingId: item.id,
      actorId: null,
      transition: `${from}->${item.status}`,
      reasonCode: reason,
      before: { status: from },
      after: { status: item.status },
      timestamp: new Date().toISOString(),
    });
  if (command.action === 'settings') {
    if (command.settings.version !== (empty ? 0 : data.settings.version))
      throw new DemoFailure(409, 'These settings changed. Reload.');
    data.configured = true;
    data.settings = {
      ...command.settings,
      version: command.settings.version + 1,
      status: command.settings.enabled ? 'live' : 'configured',
    };
  } else if ('version' in command && !('id' in command)) {
    if (command.version !== data.settings.version)
      throw new DemoFailure(409, 'These settings changed. Reload.');
    if ('host' in command)
      data.settings.allowedImageHosts =
        command.action === 'add-host'
          ? [...new Set([...data.settings.allowedImageHosts, command.host])]
          : data.settings.allowedImageHosts.filter((h) => h !== command.host);
    else {
      data.settings.enabled = command.action === 'enable';
      data.settings.status = data.settings.enabled ? 'live' : 'disabled';
    }
    data.settings.version++;
  } else if (command.action === 'select') {
    for (const item of command.items) {
      const existing = data.items.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId,
      );
      if (existing) results.push({ id: existing.id, ok: false, code: 'ALREADY_LISTED' });
      else {
        const listing: ChannelListing = {
          ...(data.items[0] ?? storefrontManagementSeed(seed, storeId).items[0]!),
          id: seed.id(9000 + data.items.length),
          productId: item.productId,
          variantId: item.variantId,
          status: 'needs_changes' as const,
          version: 1,
        };
        const preview = mockOnlinePreview(seed, data.settings, item.productId);
        listing.title = preview.title;
        listing.issues = preview.issues;
        listing.status = preview.issues.some((i) => i.severity === 'error')
          ? 'needs_changes'
          : 'ready';
        data.items.push(listing);
        history(listing, 'selected', 'selected');
        results.push({ id: listing.id, ok: true, code: listing.status });
      }
    }
  } else if (command.action === 'overrides') {
    const item = data.items.find((i) => i.id === command.id);
    if (!item || item.version !== command.version)
      throw new DemoFailure(409, 'This listing changed. Review the latest version.');
    item.overrides = command.overrides;
    const preview = mockOnlinePreview(seed, data.settings, item.productId, item);
    const evaluated = evaluateStorefrontReadiness(preview.source);
    item.issues = evaluated.issues;
    item.status = revalidatedListingStatus(item.status, evaluated.ready, !!item.pausedAt);
    item.title = preview.source.title;
    item.version++;
    history(item, item.status, 'overrides_updated');
  } else if ('items' in command) {
    const targets =
      command.action === 'validate' && command.all
        ? data.items.map((i) => ({ id: i.id, version: i.version }))
        : command.items;
    for (const selected of targets) {
      const item = data.items.find((i) => i.id === selected.id);
      let code = 'LISTING_CHANGED',
        ok = false;
      if (item && item.version === selected.version) {
        const from = item.status;
        if (command.action === 'validate') {
          const evaluated = evaluateStorefrontReadiness(
            mockOnlinePreview(seed, data.settings, item.productId, item).source,
          );
          item.issues = evaluated.issues;
          item.status = revalidatedListingStatus(item.status, evaluated.ready, !!item.pausedAt);
        }
        const next =
          command.action === 'validate'
            ? item.status
            : command.action === 'remove'
              ? null
              : listingTransition(
                  item.status,
                  command.action,
                  !item.issues.some((i) => i.severity === 'error'),
                  data.settings.enabled,
                );
        if (command.action === 'remove') {
          data.items = data.items.filter((i) => i !== item);
          ok = true;
          code = 'REMOVED';
        } else if (next && !(demoState.scenario === 'partial' && results.length % 2 === 1)) {
          item.status = next;
          item.version++;
          ok = true;
          code = next;
        } else code = 'LISTING_TRANSITION_INVALID';
        if (ok) history(item, from, command.action);
      }
      results.push({ id: selected.id, ok, code });
    }
  }
  const result = { ok: results.every((i) => i.ok), items: results };
  data.receipts.set(command.idempotencyKey, { payload, result });
  return result;
}
