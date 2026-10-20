import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CustomerInput, CustomerCredit, CustomerQuery } from '@inventory/contracts';
import { OrganizationScope, audit } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { LocationAccess } from '../organization/location-access.js';
import { CustomerAccess, customerProjection } from './customer-access.js';
import { ReceivableCore } from './receivable-core.js';
@Injectable()
export class CustomerService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LocationAccess) private readonly locations: LocationAccess,
    @Inject(CustomerAccess) private readonly customers: CustomerAccess,
    @Inject(ReceivableCore) private readonly credit: ReceivableCore,
  ) {}
  page(actor: Actor, b: string, q: CustomerQuery) {
    return this.scope.run(actor, b, 'customers.read', async (ctx) => {
      await this.locations.store(ctx, q.storeId);
      const rows = (
        await ctx.tx.query(
          `SELECT ${customerProjection} FROM customers WHERE business_id=$1 AND store_id=$2 AND (name ILIKE $3 OR code ILIKE $3 OR email ILIKE $3 OR phone ILIKE $3) ORDER BY lower(name),id LIMIT 26 OFFSET $4`,
          [b, q.storeId, `%${q.search.replace(/[\\%_]/g, '\\$&')}%`, q.offset],
        )
      ).rows;
      return { customers: rows.slice(0, 25), hasMore: rows.length > 25, offset: q.offset };
    });
  }
  save(actor: Actor, b: string, input: CustomerInput, id?: string, version?: number) {
    return this.scope.run(actor, b, 'customers.write', async (ctx) => {
      const store = await this.locations.store(ctx, input.storeId);
      if (store.state !== 'active') throw new ConflictException();
      const target = id ?? randomUUID();
      if (id) {
        const current = await this.customers.get(ctx, id, input.storeId);
        if (
          current.version !== version ||
          current.state === 'archived' ||
          current.currency !== input.currency
        )
          throw new ConflictException();
        if (input.state === 'archived' && (await this.credit.exposure(ctx, id)) !== 0n)
          throw new ConflictException();
      }
      const values = [
        input.code,
        input.name,
        input.email,
        input.phone,
        input.address,
        input.notes,
        input.currency,
        input.state,
        b,
        input.storeId,
        target,
      ];
      if (id)
        await ctx.tx.query(
          'UPDATE customers SET code=$1,name=$2,email=$3,phone=$4,address=$5,notes=$6,currency=$7,state=$8,version=version+1,last_activity_at=now() WHERE business_id=$9 AND store_id=$10 AND id=$11',
          values,
        );
      else
        await ctx.tx.query(
          'INSERT INTO customers(code,name,email,phone,address,notes,currency,state,business_id,store_id,id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',
          values,
        );
      // Contact/name/address never enter audit metadata or operation receipts.
      await audit(ctx, target, 'customer.saved', null, {
        customerId: target,
        storeId: input.storeId,
        state: input.state,
      });
      return { id: target };
    });
  }
  policy(actor: Actor, b: string, id: string, input: CustomerCredit) {
    return this.scope.run(actor, b, 'customers.credit', async (ctx) => {
      const current = await this.customers.get(ctx, id);
      if (current.version !== input.version || current.state === 'archived')
        throw new ConflictException();
      await ctx.tx.query(
        'UPDATE customers SET credit_enabled=$1,credit_hold=$2,credit_limit_minor=$3,terms_days=$4,version=version+1,last_activity_at=now() WHERE business_id=$5 AND id=$6',
        [input.creditEnabled, input.creditHold, input.creditLimitMinor, input.termsDays, b, id],
      );
      await audit(ctx, id, 'customer.credit-policy', null, {
        customerId: id,
        storeId: current.storeId,
        creditEnabled: input.creditEnabled,
        creditHold: input.creditHold,
        amount: input.creditLimitMinor,
        termsDays: input.termsDays,
      });
      return { id };
    });
  }
}
