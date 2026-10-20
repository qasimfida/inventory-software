import {
  API_PREFIX,
  apiOriginSchema,
  authResponseSchema,
  sessionSchema,
  sessionsSchema,
} from '@inventory/contracts';
import type { Session } from '@inventory/contracts';

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
  constructor(public readonly status: number) {
    super(
      status === 401
        ? 'Sign in again. Credentials may be invalid or the session has ended.'
        : status === 403
          ? 'You do not have access to this operation.'
          : status === 404
            ? 'The record is unavailable or access has changed.'
            : status === 409
              ? 'Conflict: refresh first; check duplicate codes, active children, archive state or the last owner.'
              : status === 400
                ? 'Check the required fields and formats.'
                : status === 429
                  ? 'Too many attempts. Try again in 15 minutes.'
                  : 'Unable to complete authentication. Check your connection and try again.',
    );
  }
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
  ) {
    const token = overrideToken ?? (await store?.get());
    const response = await transport(
      `${origin}${API_PREFIX}${organization ? '/businesses' : '/auth/'}${path}`,
      {
        method,
        credentials: store ? 'omit' : 'include',
        headers: {
          'content-type': 'application/json',
          'x-inventory-client': store ? 'native' : 'web',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    if (!response.ok) {
      if (response.status === 401) await store?.clear();
      throw new AuthenticationError(response.status);
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
    organizationRequest: (path: string, method = 'GET', body?: unknown) =>
      serial(() => send(path, method, body, undefined, true)),
    login: (email: string, password: string) =>
      serial(() => establish('login', { email, password })),
    accept: (email: string, password: string, invitationToken: string) =>
      serial(() => establish('invitations/accept', { email, password, invitationToken })),
    current: () => serial(async () => sessionSchema.parse(await send('session'))),
    renew: () => serial(() => establish('renew')),
    list: () => serial(async () => sessionsSchema.parse(await send('sessions')).sessions),
    revoke: (id: string) =>
      serial(async () => {
        await send(`sessions/${encodeURIComponent(id)}`, 'DELETE');
      }),
    logout: (all = false) =>
      serial(async () => {
        await send(all ? 'sessions' : 'logout', all ? 'DELETE' : 'POST');
        await store?.clear();
      }),
  };
}
