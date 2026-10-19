import { createApiClient } from '@inventory/api-client';

const baseUrl: unknown = import.meta.env.VITE_API_BASE_URL;
if (typeof baseUrl !== 'string' || !baseUrl) {
  throw new Error('Set VITE_API_BASE_URL to the API origin in apps/web/.env.');
}

export const apiClient = createApiClient(baseUrl, (url) =>
  fetch(url, { signal: AbortSignal.timeout(5000) }),
);
