import { payableDetailSchema, payablePageSchema, payableQuerySchema } from '@inventory/contracts';
import type { PayableQuery, SupplierCredit, SupplierSettlement } from '@inventory/contracts';
import { z } from 'zod';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
import { queryString } from './catalog.js';

export function createPayableClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/payables`;
  const commands = new RetryableCommands(request, newKey);
  const result = (value: unknown) => z.object({ id: z.uuid() }).parse(value);
  return {
    load: async (query: Partial<PayableQuery>) =>
      payablePageSchema.parse(
        await request(`${path}?${queryString(payableQuerySchema.parse(query))}`),
      ),
    detail: async (id: string, offset = 0) =>
      payableDetailSchema.parse(
        await request(`${path}/${encodeURIComponent(id)}?offset=${offset}`),
      ),
    settle: (id: string, input: Omit<SupplierSettlement, 'idempotencyKey'>) =>
      commands.run(`${path}/${encodeURIComponent(id)}/settlements`, input, result),
    credit: (id: string, input: Omit<SupplierCredit, 'idempotencyKey'>) =>
      commands.run(`${path}/${encodeURIComponent(id)}/credits`, input, result),
  };
}
