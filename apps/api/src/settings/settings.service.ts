import { requireBusinessScope } from '../catalog/catalog.repository.js';
import { setupChecklist } from './setup-checklist.js';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { z } from 'zod';
import { preferenceRecordSchema, policyRecordSchema } from '@inventory/contracts';
import { DatabaseService } from '../database/database.service.js';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { securityEvent } from '../security/events.js';
import {
  PLATFORM_SCOPE,
  platformAdmin,
  readPolicy,
  readPreferences,
  requirePlatformAdmin,
  writePolicy,
} from './settings-store.js';
@Injectable()
export class SettingsService {
  constructor(
    @Inject(DatabaseService) private readonly db: DatabaseService,
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
  ) {}
  setup(actor: Actor, businessId: string) {
    return this.scope.run(actor, businessId, 'business.write', setupChecklist);
  }
  dismissSetup(actor: Actor, businessId: string) {
    return this.scope.run(actor, businessId, 'business.write', async (ctx) => {
      const status = await setupChecklist(ctx);
      if (
        ![
          status.profile,
          status.currency,
          status.tax,
          status.locations,
          status.product,
          status.stock,
        ].every(Boolean)
      )
        throw new BadRequestException('Complete all setup steps before dismissing.');
      if (!status.dismissed) {
        await ctx.tx.query('UPDATE businesses SET setup_dismissed=true WHERE id=$1', [businessId]);
        await audit(
          ctx,
          businessId,
          'business.setup_dismissed',
          { dismissed: false },
          { dismissed: true },
        );
      }
      return { ...status, dismissed: true };
    });
  }
  snapshot(actor: Actor) {
    return this.db.transaction(async (tx) => ({
      preferences: await readPreferences(tx, actor.accountId),
      platform: await readPolicy(tx),
      canManagePlatform: await platformAdmin(tx, actor.accountId),
      connectivity: {
        online: true,
        offlineCash: 'bounded-grant',
        localNetwork: 'deployment-required',
      },
    }));
  }
  preferences(actor: Actor, input: z.infer<typeof preferenceRecordSchema>) {
    return this.db.transaction(async (tx) => {
      const active = await tx.query(
        "SELECT id FROM auth_accounts WHERE id=$1 AND status='active' FOR NO KEY UPDATE",
        [actor.accountId],
      );
      if (!active.rowCount) throw new UnauthorizedException();
      const current = await readPreferences(tx, actor.accountId);
      if (current.version !== input.version) throw new ConflictException();
      await tx.query(
        `INSERT INTO user_preferences(account_id,data) VALUES($1,$2)
        ON CONFLICT(account_id) DO UPDATE SET data=$2,version=user_preferences.version+1,updated_at=now()`,
        [actor.accountId, JSON.stringify(input.values)],
      );
      await securityEvent(tx, {
        event: 'settings.preferences_changed',
        actorId: actor.accountId,
        requestId: actor.requestId,
      });
      return readPreferences(tx, actor.accountId);
    });
  }
  platform(actor: Actor, input: z.infer<typeof policyRecordSchema>) {
    return this.db.transaction(async (tx) => {
      await requirePlatformAdmin(tx, actor.accountId);
      if (input.values.industry || input.values.company) throw new BadRequestException();
      const before = await readPolicy(tx);
      await writePolicy(tx, PLATFORM_SCOPE, input.version, input.values);
      await securityEvent(tx, {
        event: 'settings.platform_changed',
        policyChange: { before: before.values, after: input.values },
        actorId: actor.accountId,
        requestId: actor.requestId,
      });
      return readPolicy(tx);
    });
  }
  business(actor: Actor, businessId: string, input?: z.infer<typeof policyRecordSchema>) {
    return this.scope.run(
      actor,
      businessId,
      input ? 'business.write' : 'business.read',
      async (ctx) => {
        const before = await readPolicy(ctx.tx, businessId);
        if (!input) return before;
        if (input.values.company || before.values.company) requireBusinessScope(ctx);
        if (
          input.values.notifications.notifyUser !== undefined ||
          input.values.notifications.notifyPlatformAdmins !== undefined
        )
          throw new BadRequestException();
        await writePolicy(ctx.tx, businessId, input.version, input.values);
        const after = await readPolicy(ctx.tx, businessId);
        await audit(ctx, businessId, 'settings.policy_changed', before, after);
        await securityEvent(ctx.tx, {
          event: 'settings.business_changed',
          policyChange: { before: before.values, after: after.values },
          actorId: actor.accountId,
          businessId,
          requestId: actor.requestId,
        });
        return after;
      },
    );
  }
}
