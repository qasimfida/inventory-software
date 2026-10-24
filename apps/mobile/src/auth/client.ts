import { deviceMarker } from './device-marker';
import { createAuthClient, memoryCredentialStore } from '@inventory/api-client';
import { createCredentialStore } from './credential-store';
import { authTransport } from './transport';
import { apiOrigin } from './api-origin';
const mocks = __DEV__ && process.env.EXPO_PUBLIC_USE_MOCKS === 'true';
const transport: typeof authTransport = mocks
  ? async (url, options) => (await import('@inventory/api-client/mock')).demoTransport(url, options)
  : authTransport;
export const authClient = createAuthClient(
  apiOrigin,
  transport,
  mocks ? memoryCredentialStore() : createCredentialStore(apiOrigin),
  mocks ? undefined : deviceMarker,
);
