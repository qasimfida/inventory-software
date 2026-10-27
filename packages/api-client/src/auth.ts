import { throwIfCancelled } from './cancellation.js';
import type { CancellationSignal } from './cancellation.js';
import {
  API_PREFIX,
  apiOriginSchema,
  authResponseSchema,
  sessionSchema,
  sessionsSchema,
  apiErrorSchema,
  authMutationSchema,
  recoveryStatusSchema,
} from '@inventory/contracts';
import type { Session, ApiErrorResponse } from '@inventory/contracts';

export interface CredentialStore {
  get(): Promise<string | null>;
  set(token: string): Promise<void>;
  clear(): Promise<void>;
}
export interface AuthRequestOptions {
  method: string;
  headers: Record<string, string>;
  credentials: 'include' | 'omit';
  body?: string;
  signal?: CancellationSignal;
}
export type AuthTransport = (
  url: string,
  options: AuthRequestOptions,
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;
export class AuthenticationError extends Error {
  constructor(
    public readonly status: number,
    public readonly details?: ApiErrorResponse,
  ) {
    super(
      details &&
        [
          'PRICE_UNAVAILABLE',
          'CART_CURRENCY_MISMATCH',
          'CHECKOUT_STORE_REQUIRED',
          'LISTING_CHANGED',
          'STOREFRONT_CHANGED',
          'LISTING_TRANSITION_INVALID',
          'STOREFRONT_SETUP_INCOMPLETE',
        ].includes(details.code)
        ? details.message
        : status === 401
          ? 'Sign in again. Credentials may be invalid or the session has ended.'
          : status === 403
            ? 'You do not have access to this operation.'
            : status === 404
              ? 'The record is unavailable or access has changed.'
              : status === 409
                ? 'This change could not be saved. The record may have changed or a code is already in use. Reload the record and review your changes.'
                : status === 400
                  ? 'Check the required fields and formats.'
                  : status === 429
                    ? 'Too many attempts. Try again in 15 minutes.'
                    : 'Unable to complete the request. Check your connection and review transaction status before retrying.',
    );
    // Correlation IDs remain available in details for support, not routine user messages.
  }
}
/** Background read failures may retain already verified UI until its original session expires. */
export function isTransientReadFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error instanceof TypeError ||
      ['AbortError', 'TimeoutError'].includes(error.name) ||
      ('status' in error && Number(error.status) >= 500))
  );
}
export function memoryCredentialStore(): CredentialStore {
  let token: string | null = null;
  return {
    get: async () => token,
    set: async (value) => {
      token = value;
    },
    clear: async () => {
      token = null;
    },
  };
}
export function createAuthClient(
  baseUrl: string,
  transport: AuthTransport,
  store: CredentialStore | null,
  deviceMarker?: () => Promise<string | null>,
) {
  const origin = apiOriginSchema.parse(baseUrl);
  let pending: Promise<unknown> = Promise.resolve();
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const next = pending.then(work, work);
    pending = next.catch(() => undefined);
    return next;
  }
  async function send(
    path: string,
    method = 'GET',
    body?: unknown,
    overrideToken?: string,
    organization = false,
    signal?: CancellationSignal,
  ) {
    throwIfCancelled(signal);
    const marker =
      deviceMarker && ['login', 'invitations/accept'].includes(path)
        ? await deviceMarker().catch(() => null)
        : null;
    const token = overrideToken ?? (await store?.get());
    const response = await transport(
      `${origin}${API_PREFIX}${organization ? '/businesses' : '/auth/'}${path}`,
      {
        method,
        ...(signal ? { signal } : {}),
        credentials: store ? 'omit' : 'include',
        headers: {
          'content-type': 'application/json',
          ...(marker ? { 'x-inventory-device': marker } : {}),
          'x-inventory-client': store ? 'native' : 'web',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    throwIfCancelled(signal);
    if (!response.ok) {
      if (response.status === 401) await store?.clear();
      const detail = apiErrorSchema.safeParse(await response.json().catch(() => undefined));
      const error = new AuthenticationError(
        response.status,
        detail.success ? detail.data : undefined,
      );
      if (path === 'login' && response.status === 401)
        error.message = 'Email or password is incorrect. Check your details and try again.';
      throw error;
    }
    return response.json();
  }
  async function establish(path: string, body?: unknown): Promise<Session> {
    const result = authResponseSchema.parse(await send(path, 'POST', body));
    if (store) {
      if (!result.token) throw new AuthenticationError(502);
      try {
        await store.set(result.token);
      } catch (error) {
        try {
          await send('logout', 'POST', undefined, result.token);
        } finally {
          await store.clear();
        }
        throw error;
      }
    }
    return sessionSchema.parse({
      user: result.user,
      sessionId: result.sessionId,
      expiresAt: result.expiresAt,
      absoluteExpiresAt: result.absoluteExpiresAt,
    });
  }
  return {
    catalogSocketUrl: `${origin.replace(/^http/, 'ws')}${API_PREFIX}/catalog-live`,
    accountRequest: (path: string, method = 'GET', body?: unknown, signal?: CancellationSignal) =>
      serial(() => send(path, method, body, undefined, false, signal)),
    organizationRequest: (
      path: string,
      method = 'GET',
      body?: unknown,
      signal?: CancellationSignal,
    ) => serial(() => send(path, method, body, undefined, true, signal)),
    login: (email: string, password: string) =>
      serial(() => establish('login', { email, password })),
    accept: (email: string, password: string, invitationToken: string) =>
      serial(() => establish('invitations/accept', { email, password, invitationToken })),
    recoveryStatus: (email: string, resetToken: string) =>
      serial(async () =>
        recoveryStatusSchema.parse(await send('password/status', 'POST', { email, resetToken })),
      ),
    resetPassword: (email: string, password: string, resetToken: string) =>
      serial(async () => {
        authMutationSchema.parse(
          await send('password/reset', 'POST', { email, password, resetToken }),
        );
        await store?.clear();
      }),
    current: () => serial(async () => sessionSchema.parse(await send('session'))),
    renew: () => serial(() => establish('renew')),
    list: () =>
      serial(async () => sessionsSchema.parse(await send('sessions?includeDevice=true')).sessions),
    revoke: (id: string) =>
      serial(async () => {
        authMutationSchema.parse(await send(`sessions/${encodeURIComponent(id)}`, 'DELETE'));
      }),
    logout: (all = false) =>
      serial(async () => {
        authMutationSchema.parse(await send(all ? 'sessions' : 'logout', all ? 'DELETE' : 'POST'));
        await store?.clear();
      }),
  };
}
