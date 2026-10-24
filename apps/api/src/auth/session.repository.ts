import { securityEvent } from '../security/events.js';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import type { Transaction } from '../database/transaction.js';
import { newToken, tokenHash } from './secrets.js';

export type SessionTransport = 'cookie' | 'bearer';
export interface Identity {
  id: string;
  account_id: string;
  email: string;
  transport: SessionTransport;
  expires_at: Date;
  absolute_expires_at: Date;
}
const projection = 's.id, s.account_id, a.email, s.transport, s.expires_at, s.absolute_expires_at';
@Injectable()
export class SessionRepository {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}
  async create(tx: Transaction, accountId: string, transport: SessionTransport) {
    const token = newToken();
    await tx.query(
      `UPDATE auth_sessions SET revoked_at=now() WHERE id IN
      (SELECT id FROM auth_sessions WHERE account_id=$1 AND revoked_at IS NULL AND expires_at>now()
      ORDER BY created_at DESC, id DESC OFFSET 9)`,
      [accountId],
    );
    const result = await tx.query<Identity>(
      `INSERT INTO auth_sessions
      (id, account_id, token_hash, transport, expires_at, absolute_expires_at)
      VALUES ($1,$2,$3,$4,now() + interval '30 minutes',now() + interval '12 hours')
      RETURNING id, account_id, transport, expires_at, absolute_expires_at`,
      [randomUUID(), accountId, tokenHash(token), transport],
    );
    return { token, session: result.rows[0]! };
  }
  async authenticate(token: string, transport: SessionTransport): Promise<Identity> {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new UnauthorizedException();
    const result = await this.database.query<Identity>(
      `SELECT ${projection}
      FROM auth_sessions s JOIN auth_accounts a ON a.id=s.account_id
      WHERE s.token_hash=$1 AND s.transport=$2 AND s.revoked_at IS NULL
      AND s.expires_at>now() AND s.absolute_expires_at>now() AND a.status='active'`,
      [tokenHash(token), transport],
    );
    if (!result.rows[0]) throw new UnauthorizedException();
    return result.rows[0];
  }
  async renew(identity: Identity, oldToken: string, requestId?: string) {
    const token = newToken();
    return this.database.transaction(async (tx) => {
      await tx.query('SELECT id FROM auth_accounts WHERE id=$1 FOR NO KEY UPDATE', [
        identity.account_id,
      ]);
      const result = await tx.query<Identity>(
        `UPDATE auth_sessions s
      SET token_hash=$1, expires_at=LEAST(now()+interval '30 minutes',absolute_expires_at)
      FROM auth_accounts a WHERE s.id=$2 AND s.token_hash=$3 AND a.id=s.account_id
      AND a.status='active' AND s.revoked_at IS NULL AND s.expires_at>now()
      AND s.absolute_expires_at>now() RETURNING ${projection}`,
        [tokenHash(token), identity.id, tokenHash(oldToken)],
      );
      if (!result.rows[0]) throw new UnauthorizedException();
      await securityEvent(tx, {
        event: 'session.renewed',
        sessionId: identity.id,
        actorId: identity.account_id,
        ...(requestId ? { requestId } : {}),
      });
      return { token, session: result.rows[0] };
    });
  }
  async list(accountId: string) {
    return (
      await this.database.query<{
        id: string;
        created_at: Date;
        expires_at: Date;
        transport: SessionTransport;
        device_id: string | null;
      }>(
        `SELECT id,created_at,expires_at,transport,device_id FROM auth_sessions WHERE account_id=$1
      AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC`,
        [accountId],
      )
    ).rows;
  }
  async revoke(accountId: string, sessionId?: string, requestId?: string) {
    await this.database.transaction(async (tx) => {
      // Serialize revocation-all with login to give this operation a clear boundary.
      await tx.query('SELECT id FROM auth_accounts WHERE id=$1 FOR NO KEY UPDATE', [accountId]);
      const changed = await tx.query(
        `UPDATE auth_sessions SET revoked_at=now() WHERE account_id=$1
        AND ($2::uuid IS NULL OR id=$2::uuid) AND revoked_at IS NULL`,
        [accountId, sessionId ?? null],
      );
      if (changed.rowCount) {
        await securityEvent(tx, {
          event: sessionId ? 'session.revoked' : 'session.revoked_all',
          ...(sessionId ? { sessionId } : {}),
          actorId: accountId,
          ...(requestId ? { requestId } : {}),
        });
      }
    });
  }
}
