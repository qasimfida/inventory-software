import {
  leaseSchema,
  offlinePolicySchema,
  deltaSchema,
  uploadResultSchema,
  syncResultSchema,
} from '@inventory/contracts';
import type { OfflinePolicy, OfflineSale, DeltaQuery } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { z } from 'zod';
import { queryString } from './catalog.js';
export function createSyncClient(request: OrganizationTransport, businessId: string) {
  const path = `/${encodeURIComponent(businessId)}/sync`;
  return {
    events: async (q: Omit<DeltaQuery, 'cursor'>) =>
      z
        .object({ revision: z.string(), clockVersion: z.number() })
        .parse(await request(`${path}/events?${queryString(q)}`)),
    identity: async () => z.object({ actorId: z.uuid() }).parse(await request(`${path}/identity`)),
    policy: async () => offlinePolicySchema.parse(await request(`${path}/policy`)),
    savePolicy: async (input: OfflinePolicy) =>
      offlinePolicySchema.parse(
        await request(`${path}/policy`, 'PUT', offlinePolicySchema.parse(input)),
      ),
    prepare: async (input: { warehouseId: string; currency: string; deviceId: string }) =>
      leaseSchema.parse(await request(`${path}/prepare`, 'POST', input)),
    pull: async (q: DeltaQuery) =>
      deltaSchema.parse(await request(`${path}/delta?${queryString(q)}`)),
    upload: async (operations: OfflineSale[]) =>
      uploadResultSchema.parse(await request(`${path}/upload`, 'POST', { operations })),
    reconcile: async (id: string, note: string) =>
      syncResultSchema.parse(
        await request(`${path}/operations/${encodeURIComponent(id)}/reconcile`, 'POST', { note }),
      ),
  };
}
