import type { CancellationSignal } from './cancellation.js';
import { dashboardQuerySchema, dashboardSchema } from '@inventory/contracts';
import type { DashboardQuery } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { queryString } from './catalog.js';
export function createDashboardClient(request: OrganizationTransport, businessId: string) {
  return {
    load: async (query: DashboardQuery, signal?: CancellationSignal) =>
      dashboardSchema.parse(
        await request(
          `/${encodeURIComponent(businessId)}/reports/overview?${queryString(dashboardQuerySchema.parse(query))}`,
          'GET',
          undefined,
          signal,
        ),
      ),
  };
}
/** Display-only percentage with exact integers; zero baseline has no comparison. */
export function dashboardGrowth(current: string, previous: string): string | null {
  const baseline = BigInt(previous);
  if (baseline === 0n) return null;
  const change = ((BigInt(current) - baseline) * 10000n) / baseline;
  const magnitude = change < 0n ? -change : change;
  return `${change < 0n ? '−' : '+'}${magnitude / 100n}.${String(magnitude % 100n).padStart(2, '0')}%`;
}
/** Approximate geometry only; labels retain exact monetary strings. */
export function dashboardHeights(values: string[]): number[] {
  const amounts = values.map(BigInt),
    max = amounts.reduce((a, b) => (a > b ? a : b), 0n);
  return amounts.map((value) => (max === 0n ? 0 : Number((value * 10000n) / max) / 100));
}
