import { recordLogin } from '../security/device-login.js';
import type { LoginContext } from '../security/device-login.js';
import { securityEvent } from '../security/events.js';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../database/database.service.js';
import { hashPassword, tokenHash, verifyPassword } from './secrets.js';
import { SessionRepository } from './session.repository.js';
import type { SessionTransport } from './session.repository.js';
import type { AcceptInvitationDto, LoginDto, ResetPasswordDto } from './auth.dto.js';
import { completeRecovery, inspectRecovery } from './password-recovery.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
    @Inject(SessionRepository) private readonly sessions: SessionRepository,
  ) {}
  recoveryStatus(input: { email: string; resetToken: string }) {
    return inspectRecovery(this.database, input);
  }
  reset(input: ResetPasswordDto, requestId?: string) {
    return completeRecovery(this.database, input, requestId);
  }
  async login(input: LoginDto, transport: SessionTransport, context?: LoginContext) {
    const account = (
      await this.database.query<{ id: string; password_hash: string }>(
        'SELECT id,password_hash FROM auth_accounts WHERE email=$1',
        [input.email],
      )
    ).rows[0];
    if (!(await verifyPassword(input.password, account?.password_hash)) || !account) {
      await this.database.transaction((tx) =>
        securityEvent(tx, {
          event: 'login.denied',
          outcome: 'denied',
          subjectHash: tokenHash(input.email),
          ...(context ? { requestId: context.requestId } : {}),
        }),
      );
      throw new UnauthorizedException();
    }
    return this.database
      .transaction(async (tx) => {
        const active = await tx.query(
          `SELECT id FROM auth_accounts WHERE id=$1 AND password_hash=$2 AND status='active' FOR NO KEY UPDATE`,
          [account.id, account.password_hash],
        );
        if (!active.rowCount) throw new UnauthorizedException();
        const created = await this.sessions.create(tx, account.id, transport);
        await recordLogin(tx, created.session.account_id, created.session.id, context);
        return { ...created, session: { ...created.session, email: input.email } };
      })
      .catch(async (error: unknown) => {
        if (error instanceof UnauthorizedException)
          await this.database.transaction((tx) =>
            securityEvent(tx, {
              event: 'login.denied',
              outcome: 'denied',
              subjectHash: tokenHash(input.email),
              ...(context ? { requestId: context.requestId } : {}),
            }),
          );
        throw error;
      });
  }
  async accept(input: AcceptInvitationDto, transport: SessionTransport, context?: LoginContext) {
    const hashed = await hashPassword(input.password);
    return this.database.transaction(async (tx) => {
      const invitation = await tx.query(
        `UPDATE auth_invitations SET consumed_at=now()
        WHERE token_hash=$1 AND email=$2 AND consumed_at IS NULL AND expires_at>now() RETURNING email`,
        [tokenHash(input.invitationToken), input.email],
      );
      if (!invitation.rowCount) throw new UnauthorizedException();
      const accountId = randomUUID();
      const inserted = await tx.query(
        `INSERT INTO auth_accounts(id,email,password_hash) VALUES($1,$2,$3)
        ON CONFLICT(email) DO NOTHING RETURNING id`,
        [accountId, input.email, hashed],
      );
      if (!inserted.rowCount) throw new UnauthorizedException();
      const created = await this.sessions.create(tx, accountId, transport);
      await recordLogin(tx, created.session.account_id, created.session.id, context);
      return { ...created, session: { ...created.session, email: input.email } };
    });
  }
}
