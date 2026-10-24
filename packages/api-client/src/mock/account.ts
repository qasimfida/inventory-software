import { createDemoSeed } from './seed.js';
import { platformDemoRequest } from './platform.js';
import { preferenceRecordSchema, preferenceSchema } from '@inventory/contracts';
import { demoState, demoPreferences } from './state.js';
import { demoRoles, demoId, demoDate } from './identity.js';
export class DemoFailure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function demoSession() {
  return {
    user: {
      id: demoId(900 + demoRoles.indexOf(demoState.role)),
      email: `${demoState.role}@demo.example.test`,
      status: 'active' as const,
    },
    sessionId: demoId(990),
    expiresAt: demoDate(-1),
    absoluteExpiresAt: demoDate(-7),
  };
}
const policy = { version: 0, values: { defaults: {}, enforced: {}, notifications: {} } };
export function accountRequest(
  path: string,
  method: string,
  body: unknown,
  q: { get(key: string): string | null },
): unknown {
  if (path === 'login' || path === 'invitations/accept') {
    if (body && typeof body === 'object' && 'email' in body && typeof body.email === 'string') {
      const role = body.email.split('@')[0];
      if (demoRoles.some((r) => r === role) && role !== demoState.role) {
        // Explicit demo identities select their matching scoped fixtures; never contacts the API.
        const selected = demoRoles.find((r) => r === role)!;
        demoState.role = selected;
        demoState.seeds = [createDemoSeed(0, selected), createDemoSeed(1, selected)];
      }
    }
    demoState.authenticated = true;
    return { ...demoSession(), token: 'd'.repeat(43) };
  }
  if (path === 'password/status' || path === 'password/reset')
    throw new DemoFailure(
      400,
      'Recovery requires the real API; demonstration accounts have no recovery credentials.',
    );
  if (!demoState.authenticated)
    throw new DemoFailure(401, 'Sign in to the demonstration workspace.');
  if (path === 'session') return demoSession();
  if (path === 'renew') return { ...demoSession(), token: 'd'.repeat(43) };
  if (path === 'logout' || (path.startsWith('sessions') && method === 'DELETE')) {
    demoState.authenticated = false;
    return { ok: true };
  }
  if (path === 'sessions')
    return {
      sessions: [
        {
          id: demoId(990),
          createdAt: demoDate(),
          expiresAt: demoDate(-1),
          transport: 'bearer',
          deviceId: demoId(991),
        },
      ],
    };
  if (path === 'settings' && method === 'PUT') {
    const input = preferenceRecordSchema.parse(body),
      previous = demoPreferences();
    if (input.version !== previous.version)
      throw new DemoFailure(409, 'Reload demonstration preferences.');
    const record = {
      version: previous.version + 1,
      values: preferenceSchema.parse({ ...previous.values, ...input.values }),
    };
    demoState.preferences.set(demoState.role, record);
    return record;
  }
  if (path === 'settings')
    return {
      preferences: demoPreferences(),
      platform: policy,
      canManagePlatform: demoState.role === 'superadmin',
      connectivity: {
        online: true,
        offlineCash: 'bounded-grant',
        localNetwork: 'deployment-required',
      },
    };
  if (path.startsWith('security/platform/')) {
    if (demoState.role !== 'superadmin')
      throw new DemoFailure(403, 'Platform administrator access required.');
    return platformDemoRequest(path, q);
  }
  if (path.startsWith('security/') && method === 'POST') return { ok: true };
  const empty = demoState.scenario === 'empty';
  if (path === 'security/events')
    return {
      events: empty
        ? []
        : [
            {
              id: '1',
              occurredAt: demoDate(),
              actorId: demoSession().user.id,
              businessId: null,
              deviceId: demoId(991),
              sessionId: demoId(990),
              event: 'auth.login',
              outcome: 'success',
              requestId: demoId(992),
              policyChange: null,
            },
          ],
      nextCursor: null,
    };
  if (path === 'security/notifications')
    return {
      notifications: empty
        ? []
        : [
            {
              id: demoId(993),
              eventId: '1',
              occurredAt: demoDate(),
              actorId: demoSession().user.id,
              deviceId: demoId(991),
              businessId: null,
              audience: 'self',
              readAt: null,
            },
          ],
      nextCursor: null,
    };
  if (path === 'security/deliveries') return { deliveries: [] };
  if (path === 'security/diagnostics') {
    if (demoState.role !== 'superadmin')
      throw new DemoFailure(403, 'Platform administrator access required.');
    return {
      diagnostics: empty
        ? []
        : [
            {
              id: demoId(995),
              occurredAt: demoDate(),
              requestId: demoId(996),
              environment: 'demo',
              applicationVersion: 'local',
              code: 'UNAVAILABLE',
              category: 'connectivity',
              operation: 'demo.health',
              severity: 'warning',
              retryable: true,
              reason: 'Simulated unavailable service',
              recovery: 'Review connectivity before retrying.',
              actorId: demoSession().user.id,
            },
          ],
    };
  }
  throw new DemoFailure(404, 'This account operation is not simulated.');
}
