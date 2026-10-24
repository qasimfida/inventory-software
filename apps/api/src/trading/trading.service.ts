import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  TradingInvite,
  TradingConsent,
  TradingOrderInput,
  TradingTransition,
} from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { idempotent } from '../database/idempotency.js';
import {
  relationship,
  order,
  relationshipProjection,
  orderProjection,
  tradingEvent,
} from './trading.repository.js';
@Injectable()
export class TradingService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  list(actor: Actor, b: string, offset: number) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      const relationships = (
        await ctx.tx.query(
          `SELECT ${relationshipProjection} FROM trading_relationships WHERE $1 IN(proposer_id,partner_id) ORDER BY created_at DESC,id LIMIT 51 OFFSET $2`,
          [b, offset],
        )
      ).rows;
      const orders = (
        await ctx.tx.query(
          `SELECT ${orderProjection} FROM trading_orders WHERE $1 IN(buyer_id,seller_id) ORDER BY created_at DESC,id LIMIT 51 OFFSET $2`,
          [b, offset],
        )
      ).rows;
      return {
        relationships: relationships.slice(0, 50),
        orders: orders.slice(0, 50),
        hasMoreRelationships: relationships.length > 50,
        hasMoreOrders: orders.length > 50,
        offset,
      };
    });
  }
  invite(actor: Actor, b: string, input: TradingInvite) {
    return this.scope.run(actor, b, 'business.write', (ctx) =>
      idempotent(ctx, 'trading.invite', input.idempotencyKey, input, async () => {
        if (b === input.partnerId || ctx.business.state !== 'active') throw new ConflictException();
        // Knowing an identifier discloses no name, membership, pricing or inventory.
        const target = await ctx.tx.query(
          "SELECT 1 FROM businesses WHERE id=$1 AND state='active'",
          [input.partnerId],
        );
        if (!target.rowCount) throw new NotFoundException();
        const id = randomUUID();
        await ctx.tx.query(
          'INSERT INTO trading_relationships(id,proposer_id,partner_id) VALUES($1,$2,$3)',
          [id, b, input.partnerId],
        );
        await audit(ctx, id, 'trading.invited', null, { state: 'pending' });
        return relationship(ctx, id);
      }),
    );
  }
  consent(actor: Actor, b: string, id: string, input: TradingConsent) {
    return this.scope.run(actor, b, 'business.write', (ctx) =>
      idempotent(ctx, 'trading.consent', input.idempotencyKey, { id, ...input }, async () => {
        const current = await relationship(ctx, id);
        if (
          current.version !== input.version ||
          current.state === 'revoked' ||
          (input.action === 'accept' && (current.partnerId !== b || current.state !== 'pending')) ||
          ctx.business.state !== 'active'
        )
          throw new ConflictException();
        const state = input.action === 'accept' ? 'active' : 'revoked';
        await ctx.tx.query(
          'UPDATE trading_relationships SET state=$2,version=version+1 WHERE id=$1',
          [id, state],
        );
        await audit(ctx, id, `trading.${input.action}`, current, { state });
        return relationship(ctx, id);
      }),
    );
  }
  create(actor: Actor, b: string, input: TradingOrderInput) {
    return this.scope.run(actor, b, 'business.write', (ctx) =>
      idempotent(ctx, 'trading.order', input.idempotencyKey, input, async () => {
        const r = await relationship(ctx, input.relationshipId),
          seller = r.proposerId === b ? r.partnerId : r.proposerId;
        const active = await ctx.tx.query(
          "SELECT 1 FROM businesses WHERE id=$1 AND state='active'",
          [seller],
        );
        if (r.state !== 'active' || ctx.business.state !== 'active' || !active.rowCount)
          throw new ConflictException();
        const id = randomUUID();
        await ctx.tx.query(
          'INSERT INTO trading_orders(id,relationship_id,buyer_id,seller_id,reference,currency,lines) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [id, r.id, b, seller, input.reference, input.currency, JSON.stringify(input.lines)],
        );
        await tradingEvent(ctx, id, 'submitted', 'Buyer submitted shared terms');
        await audit(ctx, id, 'trading.submitted', null, { state: 'submitted' });
        return order(ctx, id);
      }),
    );
  }
  transition(actor: Actor, b: string, id: string, input: TradingTransition) {
    return this.scope.run(actor, b, 'business.write', (ctx) =>
      idempotent(ctx, 'trading.transition', input.idempotencyKey, { id, ...input }, async () => {
        const current = await order(ctx, id),
          r = await relationship(ctx, current.relationshipId);
        const next =
          input.action === 'accept' && current.state === 'submitted' && b === current.sellerId
            ? 'accepted'
            : input.action === 'dispatch' && current.state === 'accepted' && b === current.sellerId
              ? 'dispatched'
              : input.action === 'receive' &&
                  current.state === 'dispatched' &&
                  b === current.buyerId
                ? 'received'
                : input.action === 'cancel' && ['submitted', 'accepted'].includes(current.state)
                  ? 'cancelled'
                  : null;
        if (
          !next ||
          input.version !== current.version ||
          ctx.business.state !== 'active' ||
          (r.state !== 'active' && !['received', 'cancelled'].includes(next))
        )
          throw new ConflictException();
        await ctx.tx.query('UPDATE trading_orders SET state=$2,version=version+1 WHERE id=$1', [
          id,
          next,
        ]);
        await tradingEvent(ctx, id, next, input.note);
        await audit(ctx, id, `trading.${next}`, current, {
          state: next,
          approvalReason: input.note,
        });
        return order(ctx, id);
      }),
    );
  }
  history(actor: Actor, b: string, id: string, offset: number) {
    return this.scope.run(actor, b, 'business.write', async (ctx) => {
      await order(ctx, id);
      const rows = (
        await ctx.tx.query(
          'SELECT id::text,business_id AS "businessId",state,note,created_at::text AS "createdAt" FROM trading_events WHERE order_id=$1 ORDER BY id DESC LIMIT 51 OFFSET $2',
          [id, offset],
        )
      ).rows;
      return { events: rows.slice(0, 50), hasMore: rows.length > 50 };
    });
  }
}
