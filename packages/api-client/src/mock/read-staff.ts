import type { DemoSeed } from './seed.js';
import type { DemoQuery } from './read-inventory.js';
export function readStaff(s: DemoSeed, path: string, q: DemoQuery, empty: boolean): unknown {
  if (path === 'operations') {
    const search = (q.get('search') ?? '').toLowerCase(),
      offset = Number(q.get('offset') ?? 0);
    const staff = empty
      ? []
      : s.staff.filter((v) => `${v.name} ${v.code} ${v.title}`.toLowerCase().includes(search));
    const costs = empty
      ? []
      : s.costs
          .map((v) => v.cost)
          .filter((v) => `${v.description} ${v.reference}`.toLowerCase().includes(search));
    return {
      staff: staff.slice(offset, offset + 25),
      costs: costs.slice(offset, offset + 25),
      staffHasMore: staff.length > offset + 25,
      costsHasMore: costs.length > offset + 25,
    };
  }
  if (path.startsWith('operations/costs/'))
    return s.costs.find((v) => v.cost.id === path.split('/')[2]);
  return undefined;
}
