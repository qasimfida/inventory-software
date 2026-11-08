import { createSettingsClient, SettingsModel } from '@inventory/api-client';
// Lazy composition keeps presentational components usable without a browser transport.
export const settingsModel = new SettingsModel(
  createSettingsClient(
    async (...args) => (await import('./auth-client')).authClient.accountRequest(...args),
    async (...args) => (await import('./auth-client')).authClient.organizationRequest(...args),
  ),
  () => ({
    touch:
      typeof window !== 'undefined' && (window.matchMedia?.('(pointer: coarse)').matches ?? false),
  }),
);
