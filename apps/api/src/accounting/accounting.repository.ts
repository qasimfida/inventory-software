import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { journalSchema, journalInputSchema } from '@inventory/contracts';
import type { JournalInput } from '@inventory/contracts';
import { audit } from '../organization/organization.scope.js';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { requirePermission } from '../organization/access.js';
export function accountingAccess(ctx: OrganizationContext, write = false) {
  if (ctx.business.scope?.storeId || ctx.business.state !== 'active')
    throw new ForbiddenException();
  for (const p of ['reports.read', 'payments.read', 'sales.read', 'purchases.read'] as const)
    requirePermission(ctx.business, p);
  if (write) {
    requirePermission(ctx.business, 'payments.write');
    requirePermission(ctx.business, 'reports.write');
  }
}
export const journalProjection = `j.id,j.posted_on::text AS date,j.currency,j.reason,j.source_kind AS "sourceKind",j.source_id AS "sourceId",j.reversal_id AS "reversalId",j.created_at::text AS "createdAt",
 (SELECT json_agg(json_build_object('account',l.account,'debit',l.debit::text,'credit',l.credit::text) ORDER BY l.id) FROM accounting_lines l WHERE l.business_id=j.business_id AND l.journal_id=j.id) AS lines`;
export async function journal(ctx: OrganizationContext, id: string) {
  const row = (
    await ctx.tx.query(
      `SELECT ${journalProjection} FROM accounting_journals j WHERE j.business_id=$1 AND j.id=$2`,
      [ctx.business.id, id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return journalSchema.parse(row);
}
export async function postJournal(
  ctx: OrganizationContext,
  input: JournalInput,
  sourceKind = 'manual',
  sourceId: string | null = null,
  reversalId: string | null = null,
) {
  const parsed = journalInputSchema.safeParse(input);
  if (!parsed.success) throw new ConflictException('Source has no balanced nonzero posting.');
  const period = (
    await ctx.tx.query<{ id: string }>(
      "SELECT id FROM accounting_periods WHERE business_id=$1 AND $2::date BETWEEN starts_on AND ends_on AND state='open' FOR UPDATE",
      [ctx.business.id, input.date],
    )
  ).rows[0];
  if (!period) throw new ConflictException('Create an open accounting period for this date.');
  const id = randomUUID();
  await ctx.tx.query(
    `INSERT INTO accounting_journals(id,business_id,period_id,posted_on,currency,reason,source_kind,source_id,reversal_id,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      id,
      ctx.business.id,
      period.id,
      input.date,
      input.currency,
      input.reason,
      sourceKind,
      sourceId,
      reversalId,
      ctx.actor.accountId,
    ],
  );
  for (const l of input.lines)
    await ctx.tx.query(
      'INSERT INTO accounting_lines(business_id,journal_id,account,debit,credit) VALUES($1,$2,$3,$4,$5)',
      [ctx.business.id, id, l.account, l.debit, l.credit],
    );
  await audit(ctx, id, 'accounting.posted', null, {
    sourceKind,
    sourceId,
    reversalId,
    currency: input.currency,
    approvalReason: input.reason,
  });
  return journal(ctx, id);
}
