import { createSettingsClient, SettingsModel } from '@inventory/api-client';
// Native credential adapters load only when authenticated settings are requested.
export const settingsModel = new SettingsModel(
  createSettingsClient(
    async (...args) => (await import('../auth/client')).authClient.accountRequest(...args),
    async (...args) => (await import('../auth/client')).authClient.organizationRequest(...args),
  ),
);
