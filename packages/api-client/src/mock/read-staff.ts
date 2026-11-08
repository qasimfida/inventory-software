import type { DemoSeed } from './seed.js';
import type { DemoQuery } from './read-inventory.js';
export function readStaff(s: DemoSeed, path: string, q: DemoQuery, empty: boolean): unknown {
  if (path.startsWith('operations/staff/')) return s.staff.find((v) => v.id === path.split('/')[2]);
  if (path === 'operations/staff') {
    const rows = empty
      ? []
      : s.staff.filter((v) =>
          `${v.name} ${v.code}`.toLowerCase().includes((q.get('search') ?? '').toLowerCase()),
        );
    const offset = Number(q.get('offset') ?? 0);
    return {
      staff: rows.slice(offset, offset + 25).map((v) => ({
        id: v.id,
        name: v.name,
        code: v.code,
        title: v.title,
        storeId: v.storeId,
        state: v.state,
        version: v.version,
      })),
      hasMore: rows.length > offset + 25,
    };
  }
  if (path === 'operations') {
    const search = (q.get('search') ?? '').toLowerCase(),
      offset = Number(q.get('offset') ?? 0);
    const staff = empty
      ? []
      : s.staff.filter(
          (v) =>
            `${v.name} ${v.code} ${v.title}`.toLowerCase().includes(search) &&
            (!q.get('storeId') || v.storeId === q.get('storeId')) &&
            (!q.get('staffState') || v.state === q.get('staffState')),
        );
    const costs = empty
      ? []
      : s.costs
          .map((v) => v.cost)
          .filter(
            (v) =>
              `${v.description} ${v.reference}`.toLowerCase().includes(search) &&
              (!q.get('storeId') || v.storeId === q.get('storeId')) &&
              (!q.get('kind') || v.kind === q.get('kind')),
          );
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
