import { z } from 'zod';
import {
  customerPageSchema,
  customerStatementSchema,
  customerQuerySchema,
  retentionSchema,
  priceSchema,
} from '@inventory/contracts';
import type {
  CustomerInput,
  CustomerCredit,
  CustomerQuery,
  CustomerPayment,
} from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
import { queryString } from './catalog.js';
export function createCustomerClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/customers`,
    commands = new RetryableCommands(request, newKey);
  return {
    prices: async (id: string) =>
      z
        .object({ prices: z.array(priceSchema) })
        .parse(await request(`${path}/${encodeURIComponent(id)}/prices`)),
    load: async (q: Partial<CustomerQuery>) =>
      customerPageSchema.parse(
        await request(`${path}?${queryString(customerQuerySchema.parse(q))}`),
      ),
    save: (input: CustomerInput, id?: string, version?: number) =>
      request(`${path}${id ? '/' + encodeURIComponent(id) : ''}`, id ? 'PATCH' : 'POST', {
        ...input,
        ...(id ? { version } : {}),
      }),
    credit: (id: string, input: CustomerCredit) =>
      request(`${path}/${encodeURIComponent(id)}/credit`, 'PATCH', input),
    statement: async (id: string, offset = 0) =>
      customerStatementSchema.parse(
        await request(`${path}/${encodeURIComponent(id)}/statement?offset=${offset}`),
      ),
    pay: (id: string, input: Omit<CustomerPayment, 'idempotencyKey'>) =>
      commands.run(`${path}/${encodeURIComponent(id)}/payments`, input, (v) => v),
    retention: async () => retentionSchema.parse(await request(`${path}/retention/policy`)),
    saveRetention: (input: { inactiveDays: number; version: number }) =>
      request(`${path}/retention/policy`, 'PATCH', input),
    runRetention: () => request(`${path}/retention/run`, 'POST', {}),
  };
}
