import type { CancellationSignal } from './cancellation.js';
import { stockOverviewSchema, stockOverviewQuerySchema } from '@inventory/contracts';
import type { StockOverviewQuery } from '@inventory/contracts';
import {
  stockWorkspaceSchema,
  reconciliationSchema,
  movementSchema,
  reservationSchema,
  inventoryPolicySchema,
  stockQuerySchema,
} from '@inventory/contracts';
import type { MovementInput, ReservationInput, StockQuery } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
import { queryString } from './catalog.js';
export function createInventoryClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}`,
    commands = new RetryableCommands(request, newKey);
  return {
    overview: async (query: Partial<StockOverviewQuery>, signal?: CancellationSignal) =>
      stockOverviewSchema.parse(
        await request(
          `${path}/stock/overview?${queryString(stockOverviewQuerySchema.parse(query))}`,
          'GET',
          undefined,
          signal,
        ),
      ),
    load: async (query: Partial<StockQuery>, signal?: CancellationSignal) =>
      stockWorkspaceSchema.parse(
        await request(
          `${path}/stock?${queryString(stockQuerySchema.parse(query))}`,
          'GET',
          undefined,
          signal,
        ),
      ),
    post: (input: Omit<MovementInput, 'idempotencyKey'>) =>
      commands.run(`${path}/stock/movements`, input, (v) => movementSchema.parse(v)),
    reserve: (input: Omit<ReservationInput, 'idempotencyKey'>) =>
      commands.run(`${path}/stock/reservations`, input, (v) => reservationSchema.parse(v)),
    reverse: (id: string, reason: string) =>
      commands.run(`${path}/stock/movements/${encodeURIComponent(id)}/reverse`, { reason }, (v) =>
        movementSchema.parse(v),
      ),
    release: (id: string, reason: string) =>
      commands.run(
        `${path}/stock/reservations/${encodeURIComponent(id)}/release`,
        { reason },
        (v) => v,
      ),
    policy: async (input: { allowNegative: boolean; version: number }) =>
      inventoryPolicySchema.parse(await request(`${path}/stock/policy`, 'PATCH', input)),
    reconcile: async (warehouseId: string) =>
      reconciliationSchema.parse(
        await request(`${path}/warehouses/${encodeURIComponent(warehouseId)}/reconciliation`),
      ),
  };
}
