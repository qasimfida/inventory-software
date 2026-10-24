import { demoState } from './state.js';
import { demoDate } from './identity.js';
/** Administrative read fixtures remain in the explicit demo transport, never production. */
export function platformDemoRequest(path: string, q: { get(key: string): string | null }) {
  const empty = demoState.scenario === 'empty';
  const businesses = empty
    ? []
    : demoState.seeds.map((s, i) => ({
        id: s.business.id,
        name: s.business.name,
        state: s.business.state,
        timeZone: s.business.timeZone,
        createdAt: demoDate(i * 7),
        storeCount: String(s.locations.filter((l) => l.kind === 'stores').length),
        warehouseCount: String(s.locations.filter((l) => l.kind === 'warehouses').length),
      }));
  const offset = Math.max(0, Number(q.get('offset') ?? 0));
  if (path === 'security/platform/overview')
    return {
      asOf: demoDate(),
      totals: {
        businesses: String(businesses.length),
        activeBusinesses: String(businesses.length),
        accounts: empty ? '0' : '7',
        stores: String(businesses.length),
        warehouses: String(businesses.length * 2),
        terminals: String(businesses.length),
      },
      registrations: Array.from(
        { length: 30 },
        (unused, i) => (
          void unused,
          {
            date: demoDate(29 - i).slice(0, 10),
            count: String(
              businesses.filter((b) => b.createdAt.slice(0, 10) === demoDate(29 - i).slice(0, 10))
                .length,
            ),
          }
        ),
      ),
      businesses: businesses.map(({ id, name, state, createdAt }) => ({
        id,
        name,
        state,
        createdAt,
      })),
      total: String(businesses.length),
      offset: 0,
      hasMore: false,
    };
  if (path === 'security/platform/businesses') {
    const items = businesses.filter(
      (b) =>
        b.name.toLowerCase().includes((q.get('search') ?? '').toLowerCase()) &&
        (!q.get('state') || q.get('state') === 'all' || b.state === q.get('state')),
    );
    return {
      businesses: items.slice(offset, offset + 25),
      total: String(items.length),
      offset,
      hasMore: offset + 25 < items.length,
    };
  }
  const id = path.split('/').at(-1),
    business = businesses.find((b) => b.id === id);
  if (business) {
    const locations = demoState.seeds
      .find((s) => s.business.id === id)!
      .locations.filter((l) => l.kind !== 'terminals');
    return {
      business,
      locations: locations.slice(offset, offset + 25),
      offset,
      hasMore: offset + 25 < locations.length,
    };
  }
  return undefined;
}
