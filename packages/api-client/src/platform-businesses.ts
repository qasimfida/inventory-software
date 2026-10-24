import {
  platformBusinessesQuerySchema,
  platformBusinessesSchema,
  platformBusinessDetailSchema,
} from '@inventory/contracts';
import type { PlatformBusinessesQuery } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import type { CancellationSignal } from './cancellation.js';
export function createPlatformBusinessesClient(account: OrganizationTransport) {
  return {
    list: async (input: PlatformBusinessesQuery, signal?: CancellationSignal) => {
      const q = platformBusinessesQuerySchema.parse(input);
      return platformBusinessesSchema.parse(
        await account(
          `security/platform/businesses?search=${encodeURIComponent(q.search)}&state=${q.state}&offset=${q.offset}`,
          'GET',
          undefined,
          signal,
        ),
      );
    },
    detail: async (id: string, offset = 0, signal?: CancellationSignal) =>
      platformBusinessDetailSchema.parse(
        await account(
          `security/platform/businesses/${encodeURIComponent(id)}?offset=${offset}`,
          'GET',
          undefined,
          signal,
        ),
      ),
  };
}
