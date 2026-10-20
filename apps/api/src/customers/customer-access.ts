import { Inject, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { Customer } from '@inventory/contracts';
import type { OrganizationContext } from '../organization/organization.scope.js';
import { LocationAccess } from '../organization/location-access.js';
export const customerProjection = `id,store_id AS "storeId",code,name,email,phone,address,notes,currency,state,version,credit_enabled AS "creditEnabled",credit_hold AS "creditHold",credit_limit_minor::text AS "creditLimitMinor",terms_days AS "termsDays",(anonymized_at IS NOT NULL) AS anonymized`;
@Injectable()
export class CustomerAccess {
  async touch(ctx: OrganizationContext, id: string) {
    await this.get(ctx, id);
    await ctx.tx.query(
      'UPDATE customers SET last_activity_at=now() WHERE business_id=$1 AND id=$2',
      [ctx.business.id, id],
    );
  }

  constructor(@Inject(LocationAccess) private readonly locations: LocationAccess) {}
  async get(ctx: OrganizationContext, id: string, storeId?: string) {
    const row = (
      await ctx.tx.query<Customer>(
        `SELECT ${customerProjection} FROM customers WHERE business_id=$1 AND id=$2`,
        [ctx.business.id, id],
      )
    ).rows[0];
    if (!row || (storeId && row.storeId !== storeId)) throw new NotFoundException();
    await this.locations.store(ctx, row.storeId);
    return row;
  }
  async active(ctx: OrganizationContext, id: string, storeId: string) {
    const customer = await this.get(ctx, id, storeId);
    if (customer.state !== 'active' || customer.anonymized) throw new ConflictException();
    return customer;
  }
}
