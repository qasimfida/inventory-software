import { NotFoundException } from '@nestjs/common';
import type { TradingOrder, TradingRelationship } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
export const relationshipProjection =
  'id,proposer_id AS "proposerId",partner_id AS "partnerId",state,version';
export const orderProjection = `id,relationship_id AS "relationshipId",buyer_id AS "buyerId",seller_id AS "sellerId",reference,currency,lines,state,version,created_at::text AS "createdAt"`;
export async function relationship(ctx: OrganizationContext, id: string) {
  const row = (
    await ctx.tx.query<TradingRelationship>(
      `SELECT ${relationshipProjection} FROM trading_relationships WHERE id=$1 AND $2 IN(proposer_id,partner_id) FOR UPDATE`,
      [id, ctx.business.id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return row;
}
export async function order(ctx: OrganizationContext, id: string) {
  const row = (
    await ctx.tx.query<TradingOrder>(
      `SELECT ${orderProjection} FROM trading_orders WHERE id=$1 AND $2 IN(buyer_id,seller_id) FOR UPDATE`,
      [id, ctx.business.id],
    )
  ).rows[0];
  if (!row) throw new NotFoundException();
  return row;
}
export async function tradingEvent(
  ctx: OrganizationContext,
  id: string,
  state: string,
  note: string,
) {
  await ctx.tx.query(
    'INSERT INTO trading_events(order_id,business_id,state,note) VALUES($1,$2,$3,$4)',
    [id, ctx.business.id, state, note],
  );
}
