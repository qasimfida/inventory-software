import { z } from 'zod';
import { countDetailSchema, countHeaderSchema } from '@inventory/contracts';
import type { CountCreate, CountCapture, CountCommand, CountDetail } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
export function createCountClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/counts`,
    commands = new RetryableCommands(request, newKey),
    parse = (v: unknown) => countDetailSchema.parse(v);
  return {
    list: async (warehouseId: string) =>
      z
        .object({ counts: z.array(countHeaderSchema) })
        .parse(await request(`${path}?warehouseId=${encodeURIComponent(warehouseId)}`)),
    detail: async (id: string) => parse(await request(`${path}/${encodeURIComponent(id)}`)),
    create: (v: Omit<CountCreate, 'idempotencyKey'>) => commands.run(path, v, parse),
    capture: (id: string, v: Omit<CountCapture, 'idempotencyKey'>) =>
      commands.run(`${path}/${encodeURIComponent(id)}/capture`, v, parse),
    transition: (
      id: string,
      action: 'submit' | 'recount' | 'approve',
      v: Omit<CountCommand, 'idempotencyKey'>,
    ) => commands.run(`${path}/${encodeURIComponent(id)}/${action}`, v, parse),
  };
}
export function countExport(detail: CountDetail) {
  return JSON.stringify({ exportedAt: new Date().toISOString(), ...detail }, null, 2);
}
