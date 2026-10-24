import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AccountingAction,
  JournalInput,
  PeriodInput,
  SourcePost,
  Reversal,
} from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import {
  accountingAccess,
  journal,
  journalProjection,
  postJournal,
} from './accounting.repository.js';
import { sources, sourceProjection, loadSource, sourceLines } from './sources.js';
@Injectable()
export class AccountingService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  list(actor: Actor, b: string, offset: number) {
    return this.scope.run(actor, b, 'reports.read', async (ctx) => {
      accountingAccess(ctx);
      const periods = (
        await ctx.tx.query(
          'SELECT id,starts_on::text AS "from",ends_on::text AS "to",state FROM accounting_periods WHERE business_id=$1 ORDER BY starts_on DESC LIMIT 51 OFFSET $2',
          [b, offset],
        )
      ).rows;
      const journals = (
        await ctx.tx.query(
          `SELECT ${journalProjection} FROM accounting_journals j WHERE j.business_id=$1 ORDER BY j.created_at DESC,j.id LIMIT 51 OFFSET $2`,
          [b, offset],
        )
      ).rows;
      const pending = (
        await ctx.tx.query(
          `${sources} SELECT ${sourceProjection} FROM sources s WHERE amount>0 AND NOT EXISTS(SELECT 1 FROM accounting_journals j WHERE j.business_id=$1 AND j.source_kind=s.kind AND j.source_id=s.id) ORDER BY date,kind,id LIMIT 51 OFFSET $2`,
          [b, offset],
        )
      ).rows;
      const balances = (
        await ctx.tx.query(
          `SELECT l.account,j.currency,sum(l.debit)::text AS debit,sum(l.credit)::text AS credit FROM accounting_lines l JOIN accounting_journals j ON j.business_id=l.business_id AND j.id=l.journal_id WHERE l.business_id=$1 GROUP BY l.account,j.currency ORDER BY j.currency,l.account`,
          [b],
        )
      ).rows;
      return {
        periods: periods.slice(0, 50),
        journals: journals.slice(0, 50),
        pending: pending.slice(0, 50),
        balances,
        hasMore: [periods, journals, pending].some((v) => v.length > 50),
        offset,
      };
    });
  }
  period(actor: Actor, b: string, input: PeriodInput) {
    return this.scope.run(actor, b, 'reports.write', (ctx) => {
      accountingAccess(ctx, true);
      return idempotent(ctx, 'accounting.period', input.idempotencyKey, input, async () => {
        const id = randomUUID();
        await ctx.tx.query(
          'INSERT INTO accounting_periods(id,business_id,starts_on,ends_on) VALUES($1,$2,$3,$4)',
          [id, b, input.from, input.to],
        );
        await audit(ctx, id, 'accounting.period_created', null, {
          effectiveFrom: input.from,
          effectiveTo: input.to,
        });
        return { id };
      });
    });
  }
  close(actor: Actor, b: string, id: string, input: AccountingAction) {
    return this.scope.run(actor, b, 'reports.write', (ctx) => {
      accountingAccess(ctx, true);
      return idempotent(
        ctx,
        'accounting.close',
        input.idempotencyKey,
        { id, ...input },
        async () => {
          const period = (
            await ctx.tx.query<{ from: string; to: string; state: string }>(
              'SELECT starts_on::text AS "from",ends_on::text AS "to",state FROM accounting_periods WHERE business_id=$1 AND id=$2 FOR UPDATE',
              [b, id],
            )
          ).rows[0];
          if (!period) throw new NotFoundException();
          if (period.state !== 'open') throw new ConflictException();
          const pending = await ctx.tx.query(
            `${sources} SELECT 1 FROM sources s WHERE amount>0 AND date BETWEEN $2::date AND $3::date AND NOT EXISTS(SELECT 1 FROM accounting_journals j WHERE j.business_id=$1 AND j.source_kind=s.kind AND j.source_id=s.id) LIMIT 1`,
            [b, period.from, period.to],
          );
          if (pending.rowCount)
            throw new ConflictException('Post all known source transactions before closing.');
          // Avoid closing today's period while live operations can still create sources.
          if (period.to >= new Date().toISOString().slice(0, 10))
            throw new ConflictException('Only elapsed UTC periods can be closed.');
          await ctx.tx.query(
            "UPDATE accounting_periods SET state='closed' WHERE business_id=$1 AND id=$2",
            [b, id],
          );
          await audit(ctx, id, 'accounting.period_closed', null, {
            state: 'closed',
            approvalReason: input.reason,
          });
          return { id };
        },
      );
    });
  }
  manual(actor: Actor, b: string, input: JournalInput) {
    return this.scope.run(actor, b, 'reports.write', (ctx) => {
      accountingAccess(ctx, true);
      return idempotent(ctx, 'accounting.manual', input.idempotencyKey, input, () =>
        postJournal(ctx, input),
      );
    });
  }
  source(actor: Actor, b: string, input: SourcePost) {
    return this.scope.run(actor, b, 'reports.write', (ctx) => {
      accountingAccess(ctx, true);
      return idempotent(ctx, 'accounting.source', input.idempotencyKey, input, async () => {
        const existing = (
          await ctx.tx.query<{ id: string }>(
            'SELECT id FROM accounting_journals WHERE business_id=$1 AND source_kind=$2 AND source_id=$3',
            [b, input.kind, input.sourceId],
          )
        ).rows[0];
        if (existing) return journal(ctx, existing.id);
        const source = await loadSource(ctx, input);
        return postJournal(
          ctx,
          {
            date: source.date,
            currency: source.currency,
            reason: `Source posting: ${source.kind}`,
            lines: sourceLines(source),
            idempotencyKey: input.idempotencyKey,
          },
          source.kind,
          source.id,
        );
      });
    });
  }
  reverse(actor: Actor, b: string, id: string, input: Reversal) {
    return this.scope.run(actor, b, 'reports.write', (ctx) => {
      accountingAccess(ctx, true);
      return idempotent(
        ctx,
        'accounting.reverse',
        input.idempotencyKey,
        { id, ...input },
        async () => {
          const original = await journal(ctx, id);
          if (original.sourceKind === 'reversal' || input.date < original.date)
            throw new ConflictException('Reverse an original entry on or after its posting date.');
          return postJournal(
            ctx,
            {
              ...input,
              currency: original.currency,
              lines: original.lines.map((l) => ({ ...l, debit: l.credit, credit: l.debit })),
            },
            'reversal',
            null,
            id,
          );
        },
      );
    });
  }
}
