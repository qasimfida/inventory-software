import type { CancellationSignal } from './cancellation.js';
import { storageWorkspaceSchema, storageQuerySchema } from '@inventory/contracts';
import type { StorageInput, StorageQuery, StorageMove } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { RetryableCommands } from './retryable-commands.js';
import { queryString } from './catalog.js';
export function createStorageClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const path = `/${encodeURIComponent(businessId)}/storage`,
    commands = new RetryableCommands(request, newKey);
  return {
    load: async (q: Partial<StorageQuery>, signal?: CancellationSignal) =>
      storageWorkspaceSchema.parse(
        await request(
          `${path}?${queryString(storageQuerySchema.parse(q))}`,
          'GET',
          undefined,
          signal,
        ),
      ),
    save: (input: StorageInput, id?: string, version?: number) =>
      request(`${path}${id ? '/' + encodeURIComponent(id) : ''}`, id ? 'PATCH' : 'POST', {
        ...input,
        ...(id ? { version } : {}),
      }),
    move: (input: Omit<StorageMove, 'idempotencyKey'>) =>
      commands.run(`${path}/moves`, input, (v) => v),
  };
}
