import { createAuthClient, memoryCredentialStore } from '@inventory/api-client';

// Tauri injects this marker. No native SDK or credential persistence enters browser code.
const desktop = '__TAURI_INTERNALS__' in window;
export const authClient = createAuthClient(
  import.meta.env.VITE_API_BASE_URL as string,
  (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }),
  desktop ? memoryCredentialStore() : null,
);
