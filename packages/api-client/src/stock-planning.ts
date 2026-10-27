import {
  stockPlanningSchema,
  stockReasonInputSchema,
  reorderInputSchema,
  orderHoldInputSchema,
  stockQuerySchema,
} from '@inventory/contracts';
import type { StockReasonInput, ReorderInput, OrderHoldInput } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
import { queryString } from './catalog.js';
export function createStockPlanningClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/stock`,
    commands = new RetryableCommands(request, newKey);
  return {
    load: async (warehouseId: string, offset = 0) =>
      stockPlanningSchema.parse(
        await request(
          `${path}/planning?${queryString(stockQuerySchema.parse({ warehouseId, offset }))}`,
        ),
      ),
    reason: (input: StockReasonInput) =>
      request(`${path}/reasons`, 'PUT', stockReasonInputSchema.parse(input)),
    reorder: (input: ReorderInput) =>
      request(`${path}/reorder`, 'PUT', reorderInputSchema.parse(input)),
    hold: (input: Omit<OrderHoldInput, 'idempotencyKey'>) => {
      const parsed = orderHoldInputSchema.omit({ idempotencyKey: true }).parse(input);
      return commands.run(`${path}/holds`, parsed, (v) => v);
    },
    cancel: (id: string, reason: string) =>
      commands.run(`${path}/holds/${encodeURIComponent(id)}/cancel`, { reason }, (v) => v),
  };
}
