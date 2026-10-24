import { createApiClient } from '@inventory/api-client';
import { apiOrigin } from '@/platform/api-origin';

export const apiClient = createApiClient(apiOrigin, (url) =>
  fetch(url, { signal: AbortSignal.timeout(5000) }),
);
