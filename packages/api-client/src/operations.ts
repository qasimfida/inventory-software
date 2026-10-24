import type { CancellationSignal } from './cancellation.js';
import { z } from 'zod';
import {
  operationsPageSchema,
  costDetailSchema,
  staffSchema,
  staffInputSchema,
  staffUpdateSchema,
  costInputSchema,
  costPaymentSchema,
} from '@inventory/contracts';
import type { StaffInput, CostInput, CostPayment } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { queryString } from './catalog.js';
import { RetryableCommands } from './retryable-commands.js';
export function createOperationsClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/operations`,
    commands = new RetryableCommands(request, newKey);
  return {
    list: async (search = '', offset = 0, signal?: CancellationSignal) =>
      operationsPageSchema.parse(
        await request(`${path}?${queryString({ search, offset })}`, 'GET', undefined, signal),
      ),
    detail: async (id: string, offset = 0) =>
      costDetailSchema.parse(
        await request(`${path}/costs/${encodeURIComponent(id)}?offset=${offset}`),
      ),
    save: async (input: StaffInput, id?: string, version?: number) =>
      staffSchema.parse(
        await request(
          `${path}/staff${id ? '/' + encodeURIComponent(id) : ''}`,
          id ? 'PATCH' : 'POST',
          id ? staffUpdateSchema.parse({ ...input, version }) : staffInputSchema.parse(input),
        ),
      ),
    cost: (input: Omit<CostInput, 'idempotencyKey'>) =>
      commands.run(`${path}/costs`, input, (v) => z.object({ id: z.uuid() }).parse(v)),
    pay: (id: string, input: Omit<CostPayment, 'idempotencyKey'>) =>
      commands.run(`${path}/costs/${encodeURIComponent(id)}/payments`, input, (v) =>
        z.object({ id: z.uuid() }).parse(v),
      ),
  };
}
export { costInputSchema, costPaymentSchema };
