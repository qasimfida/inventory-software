import type { CancellationSignal } from './cancellation.js';
import { hasPermission, catalogQuerySchema } from '@inventory/contracts';
import type { Business, Location } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { createCatalogClient } from './catalog.js';
import { createCustomerClient } from './customers.js';
export interface WorkspaceSearchResult {
  title: string;
  path: string;
}
/** Bounded permission-aware entity lookup. The owning screen revalidates the destination query. */
export async function searchWorkspace(
  request: OrganizationTransport,
  business: Business,
  locations: Location[],
  query: string,
  signal?: CancellationSignal,
): Promise<WorkspaceSearchResult[]> {
  if (query.trim().length < 2 || query.length > 120) return [];
  const cancellable: OrganizationTransport = (path, method, body) =>
    request(path, method, body, signal);
  const results: WorkspaceSearchResult[] = [];
  if (hasPermission(business, 'products.read')) {
    const page = await createCatalogClient(cancellable, business.id).list(
      catalogQuerySchema.parse({ search: query, limit: 8 }),
    );
    results.push(
      ...page.items.map((p) => ({
        title: `${p.name} · ${p.sku}`,
        path: '/catalog?search=' + encodeURIComponent(p.sku),
      })),
    );
  }
  const store = locations.find((l) => l.kind === 'stores' && l.state === 'active');
  if (store && hasPermission(business, 'customers.read')) {
    const page = await createCustomerClient(
      cancellable,
      () => {
        throw new Error('Search cannot mutate records');
      },
      business.id,
    ).load({ storeId: store.id, search: query });
    results.push(
      ...page.customers
        .slice(0, 8)
        .map((c) => ({ title: c.name, path: '/customers?search=' + encodeURIComponent(c.name) })),
    );
  }
  return results;
}
