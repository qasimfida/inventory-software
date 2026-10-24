import {
  settingsSnapshotSchema,
  platformOverviewSchema,
  platformOverviewQuerySchema,
  preferenceRecordSchema,
  policyRecordSchema,
  securityPageSchema,
  notificationPageSchema,
  deliveryPageSchema,
  diagnosticPageSchema,
  authMutationSchema,
} from '@inventory/contracts';
import type { z } from 'zod';
import type { OrganizationTransport } from '../organization.js';
export function createSettingsClient(
  account: OrganizationTransport,
  business: OrganizationTransport,
) {
  return {
    load: async () => settingsSnapshotSchema.parse(await account('settings')),
    save: async (input: z.infer<typeof preferenceRecordSchema>) =>
      preferenceRecordSchema.parse(await account('settings', 'PUT', input)),
    platform: async (input: z.infer<typeof policyRecordSchema>) =>
      policyRecordSchema.parse(await account('settings/platform', 'PUT', input)),
    business: async (id: string) =>
      policyRecordSchema.parse(await business(`/${encodeURIComponent(id)}/settings`)),
    saveBusiness: async (id: string, input: z.infer<typeof policyRecordSchema>) =>
      policyRecordSchema.parse(await business(`/${encodeURIComponent(id)}/settings`, 'PUT', input)),
  };
}
const suffix = (cursor?: string) => (cursor ? `?cursor=${encodeURIComponent(cursor)}` : '');
export function createSecurityClient(account: OrganizationTransport) {
  return {
    overview: async (query: { search?: string; offset?: number } = {}) => {
      const q = platformOverviewQuerySchema.parse(query);
      return platformOverviewSchema.parse(
        await account(
          `security/platform/overview?search=${encodeURIComponent(q.search)}&offset=${q.offset}`,
        ),
      );
    },
    events: async (platform = false, cursor?: string) =>
      securityPageSchema.parse(
        await account(`security/${platform ? 'platform/' : ''}events${suffix(cursor)}`),
      ),
    inbox: async (cursor?: string) =>
      notificationPageSchema.parse(await account(`security/notifications${suffix(cursor)}`)),
    read: async (id: string) =>
      authMutationSchema.parse(
        await account(`security/notifications/${encodeURIComponent(id)}/read`, 'POST'),
      ),
    deliveries: async () => deliveryPageSchema.parse(await account('security/deliveries')),
    retry: async (id: string) =>
      authMutationSchema.parse(
        await account(`security/deliveries/${encodeURIComponent(id)}/retry`, 'POST'),
      ),
    diagnostics: async () => diagnosticPageSchema.parse(await account('security/diagnostics')),
  };
}
