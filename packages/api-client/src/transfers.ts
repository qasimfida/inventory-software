import type { CancellationSignal } from './cancellation.js';
import type { TransferAddLine } from '@inventory/contracts';
import {
  transferWorkspaceSchema,
  transferDetailSchema,
  transferQuerySchema,
} from '@inventory/contracts';
import type {
  TransferInput,
  TransferQuery,
  TransferTransition,
  TransferReceive,
} from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
import { queryString } from './catalog.js';
export function createTransferClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/transfers`,
    commands = new RetryableCommands(request, newKey),
    parse = (v: unknown) => transferDetailSchema.parse(v);
  return {
    addLine: (id: string, input: Omit<TransferAddLine, 'idempotencyKey'>) =>
      commands.run(`${path}/${encodeURIComponent(id)}/lines`, input, parse),
    load: async (q: Partial<TransferQuery>, signal?: CancellationSignal) =>
      transferWorkspaceSchema.parse(
        await request(
          `${path}?${queryString(transferQuerySchema.parse(q))}`,
          'GET',
          undefined,
          signal,
        ),
      ),
    detail: async (id: string) => parse(await request(`${path}/${encodeURIComponent(id)}`)),
    create: (input: Omit<TransferInput, 'idempotencyKey'>) => commands.run(path, input, parse),
    transition: (id: string, input: Omit<TransferTransition, 'idempotencyKey'>) =>
      commands.run(`${path}/${encodeURIComponent(id)}/transitions`, input, parse),
    receive: (id: string, input: Omit<TransferReceive, 'idempotencyKey'>) =>
      commands.run(`${path}/${encodeURIComponent(id)}/receipts`, input, parse),
  };
}
