import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type { Environment } from '../config/environment.js';
import type { Transaction } from '../database/transaction.js';
import { tokenHash } from '../auth/secrets.js';
import { securityEvent } from './events.js';
import { routeNewDevice } from './notification-routing.js';
export interface LoginContext {
  signal: string;
  kind: 'browser' | 'native';
  requestId: string;
}
const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// An installation marker is a resettable risk signal, never an authentication credential.
export function loginContext(req: Request, res: Response, env: Environment): LoginContext {
  const native = req.header('x-inventory-client') === 'native';
  const name = env.NODE_ENV === 'production' ? '__Host-inventory_device' : 'inventory_device';
  const candidates = (req.header('cookie') ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.startsWith(`${name}=`));
  const raw = native
    ? req.header('x-inventory-device')
    : candidates.length === 1
      ? candidates[0]!.slice(name.length + 1)
      : '';
  const signal = raw && valid.test(raw) ? raw : randomUUID();
  if (!native)
    res.cookie(name, signal, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 180 * 86400000,
    });
  return {
    signal,
    kind: native ? 'native' : 'browser',
    requestId: String(res.getHeader('x-request-id')),
  };
}
export async function recordLogin(
  tx: Transaction,
  accountId: string,
  sessionId: string,
  context?: LoginContext,
) {
  const ctx = context ?? { signal: randomUUID(), kind: 'native', requestId: randomUUID() };
  const inserted = await tx.query<{ id: string }>(
    `INSERT INTO recognized_devices(id,account_id,signal_hash,kind)
    VALUES($1,$2,$3,$4) ON CONFLICT(account_id,signal_hash) DO NOTHING RETURNING id`,
    [randomUUID(), accountId, tokenHash(ctx.signal), ctx.kind],
  );
  const device =
    inserted.rows[0] ??
    (
      await tx.query<{ id: string }>(
        `UPDATE recognized_devices SET last_seen_at=now()
    WHERE account_id=$1 AND signal_hash=$2 RETURNING id`,
        [accountId, tokenHash(ctx.signal)],
      )
    ).rows[0]!;
  await tx.query('UPDATE auth_sessions SET device_id=$1 WHERE id=$2', [device.id, sessionId]);
  await securityEvent(tx, {
    event: 'login.success',
    sessionId,
    actorId: accountId,
    deviceId: device.id,
    requestId: ctx.requestId,
  });
  if (inserted.rowCount) {
    const eventId = await securityEvent(tx, {
      event: 'login.new_device',
      sessionId,
      actorId: accountId,
      deviceId: device.id,
      requestId: ctx.requestId,
    });
    await routeNewDevice(tx, eventId, accountId);
  }
}
