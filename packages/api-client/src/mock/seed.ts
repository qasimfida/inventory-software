import { defaultIndustry } from '@inventory/contracts';
import { identitySeed } from './identity.js';
import { staffSeed } from './staff-seed.js';
import type { DemoRole } from './identity.js';
import { catalogSeed } from './catalog-seed.js';
import { operationsSeed } from './operations-seed.js';
import { commerceSeed } from './commerce-seed.js';
import { administrationSeed } from './administration-seed.js';
export function createDemoSeed(index: number, role: DemoRole) {
  const identity = identitySeed(index, role);
  const catalog = catalogSeed(identity.id, identity.currency);
  return {
    ...identity,
    ...catalog,
    industry: { ...defaultIndustry, lowStockThreshold: '5' },
    ...operationsSeed(identity.id, identity.currency),
    ...staffSeed(identity.id, identity.currency),
    ...commerceSeed(identity.id, catalog, identity.currency),
    ...administrationSeed(identity.id, identity.currency),
  };
}
export type DemoSeed = ReturnType<typeof createDemoSeed>;
export function demoPage<T>(
  items: T[],
  query: { get(key: string): string | null },
  search: (item: T) => string = () => '',
) {
  const term = (query.get('search') ?? '').toLowerCase();
  const filtered = term ? items.filter((item) => search(item).toLowerCase().includes(term)) : items;
  const offset = Math.max(0, Number(query.get('offset') ?? 0)),
    limit = Math.min(50, Math.max(1, Number(query.get('limit') ?? 25)));
  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    hasMore: offset + limit < filtered.length,
    offset,
    limit,
  };
}
