import {
  shiftPageSchema,
  shiftQuerySchema,
  shiftOpenSchema,
  shiftCloseSchema,
  cashAdjustmentSchema,
} from '@inventory/contracts';
import type { ShiftOpen, ShiftClose, CashAdjustment } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
import { queryString } from './catalog.js';
const placeholder = '00000000-0000-4000-8000-000000000000';
export function createCashClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/cash-shifts`,
    commands = new RetryableCommands(request, newKey);
  return {
    list: async (warehouseId: string, offset = 0) =>
      shiftPageSchema.parse(
        await request(`${path}?${queryString(shiftQuerySchema.parse({ warehouseId, offset }))}`),
      ),
    open: (input: Omit<ShiftOpen, 'idempotencyKey'>) => {
      shiftOpenSchema.parse({ ...input, idempotencyKey: placeholder });
      return commands.run(path, input, (v) => v);
    },
    close: (id: string, input: Omit<ShiftClose, 'idempotencyKey'>) => {
      shiftCloseSchema.parse({ ...input, idempotencyKey: placeholder });
      return commands.run(`${path}/${encodeURIComponent(id)}/close`, input, (v) => v);
    },
    adjust: (id: string, input: Omit<CashAdjustment, 'idempotencyKey'>) => {
      cashAdjustmentSchema.parse({ ...input, idempotencyKey: placeholder });
      return commands.run(`${path}/${encodeURIComponent(id)}/entries`, input, (v) => v);
    },
  };
}
