import { deviceMarker } from './device-marker';
import { createAuthClient, memoryCredentialStore } from '@inventory/api-client';
import { authTransport } from './auth-transport';
import { apiOrigin } from './api-origin';

// Tauri injects this marker. No native SDK or credential persistence enters browser code.
const mocks = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true';
const transport: typeof authTransport = mocks
  ? async (url, options) => (await import('@inventory/api-client/mock')).demoTransport(url, options)
  : authTransport;
const desktop = '__TAURI_INTERNALS__' in window;
export const authClient = createAuthClient(
  apiOrigin,
  transport,
  mocks || desktop ? memoryCredentialStore() : null,
  desktop && !mocks ? deviceMarker : undefined,
);
