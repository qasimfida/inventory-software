import { demoId } from './identity.js';
import { apiErrorSchema, hasPermission } from '@inventory/contracts';
import type { Permission } from '@inventory/contracts';
import type { AuthTransport } from '../auth.js';
import { demoState } from './state.js';
import { accountRequest, DemoFailure } from './account.js';
import { readInventory } from './read-inventory.js';
import { readCommerce } from './read-commerce.js';
import { readAdministration } from './read-administration.js';
import { readStaff } from './read-staff.js';
import { readReport } from './read-reports.js';
import { readDashboard } from './read-dashboard.js';
import { demoQuote } from './commerce-seed.js';
export { demoRoles } from './identity.js';
export { demoController } from './state.js';
export type { DemoRole, DemoScenario } from './identity.js';
const permissions: Record<string, Permission[]> = {
  operations: ['users.write'],
  products: ['products.read'],
  categories: ['products.read'],
  stock: ['stock.read'],
  storage: ['stock.read'],
  counts: ['stock.read'],
  'warehouse-view': ['stock.read'],
  purchasing: ['purchases.read'],
  purchases: ['purchases.read'],
  suppliers: ['purchases.read'],
  transfers: ['stock.read'],
  customers: ['customers.read'],
  pos: ['sales.write'],
  sales: ['sales.read'],
  'cash-shifts': ['payments.read'],
  payables: ['purchases.read', 'payments.read'],
  accounting: ['reports.read', 'payments.read', 'sales.read', 'purchases.read'],
  trading: ['business.write'],
  integrations: ['business.read'],
  reports: ['reports.read'],
  audit: ['audit.read'],
  notifications: ['business.read'],
  sync: ['stock.read'],
  settings: ['business.read'],
};
/** Explicit, isolated demo transport. There is deliberately no real-network fallback. */
export const demoTransport: AuthTransport = async (url, options) => {
  try {
    const tail = url.split('/api/v1/')[1];
    if (tail === undefined) throw new DemoFailure(404, 'Unknown demonstration endpoint.');
    const [path = '', query = ''] = tail.split('?');
    const pairs = new Map(
      query.split('&').map((pair) => {
        const [k = '', v = ''] = pair.split('=');
        return [decodeURIComponent(k), decodeURIComponent(v)];
      }),
    );
    const q = { get: (key: string) => pairs.get(key) ?? null };
    const body: unknown = options.body ? JSON.parse(options.body) : undefined;
    let result: unknown;
    if (path.startsWith('auth/')) result = accountRequest(path.slice(5), options.method, body, q);
    else {
      if (!demoState.authenticated)
        throw new DemoFailure(401, 'Sign in to the demonstration workspace.');
      if (path === 'businesses' && options.method === 'GET')
        result = { businesses: demoState.seeds.map((s) => s.business) };
      else {
        const [, businessId, ...segments] = path.split('/');
        const seed = demoState.seeds.find((s) => s.business.id === businessId);
        if (!seed) throw new DemoFailure(404, 'Unknown demonstration business.');
        const resource = segments.join('/');
        if (!resource)
          result = {
            business: seed.business,
            locations: seed.locations,
            members: hasPermission(seed.business, 'users.read') ? seed.members : [],
          };
        else {
          const required = permissions[segments[0]!] ?? ['business.write'];
          if (!required.every((p) => hasPermission(seed.business, p)))
            throw new DemoFailure(403, 'This demonstration role cannot access this module.');
          if (demoState.scenario === 'offline')
            throw new Error('Demonstration offline scenario. No network request was sent.');
          if (demoState.scenario === 'error')
            throw new DemoFailure(503, 'Demonstration service failure. Switch to Normal to retry.');
          const empty = demoState.scenario === 'empty';
          if (options.method === 'GET')
            result =
              resource === 'reports/overview'
                ? readDashboard(seed, q, empty)
                : resource === 'reports'
                  ? readReport(seed, q, empty)
                  : (readInventory(seed, resource, q, empty) ??
                    readCommerce(seed, resource, q, empty) ??
                    readAdministration(seed, resource, empty) ??
                    readStaff(seed, resource, q, empty));
          else if (resource === 'pos/quotes')
            result = demoQuote(body, seed.id, seed, seed.currency);
          else if (/^notifications\/[^/]+\/read$/.test(resource)) {
            const item = seed.inbox.notifications.find((n) => n.id === segments[1]);
            if (item) item.readAt = new Date().toISOString();
            result = { ok: true };
          } else
            throw new DemoFailure(
              400,
              'This action requires a live test API. Demonstration mode has not changed any records.',
            );
        }
      }
    }
    if (result === undefined) throw new DemoFailure(404, 'This operation is not simulated.');
    return { ok: true, status: 200, json: async () => result };
  } catch (error) {
    if (error instanceof DemoFailure)
      return {
        ok: false,
        status: error.status,
        json: async () =>
          apiErrorSchema.parse({
            code:
              error.status === 503
                ? 'UNAVAILABLE'
                : error.status === 401
                  ? 'UNAUTHENTICATED'
                  : error.status === 403
                    ? 'FORBIDDEN'
                    : error.status === 404
                      ? 'NOT_FOUND'
                      : 'BAD_REQUEST',
            message: error.message,
            requestId: demoId(9999),
            retryable: error.status === 503,
          }),
      };
    throw error;
  }
};

export { demoVaultStore } from './vault.js';
