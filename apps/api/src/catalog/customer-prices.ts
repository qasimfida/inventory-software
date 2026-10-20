import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { hasPermission } from '@inventory/contracts';
import type { AuthRequest } from '../auth/auth.http.js';
import { requestActor } from '../http/actor.js';
import { OrganizationScope } from '../organization/organization.scope.js';
import { CustomerAccess } from '../customers/customer-access.js';
import { priceProjection, periodWire } from './pricing.repository.js';
@Controller('businesses/:businessId/customers/:id/prices')
export class CustomerPrices {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(CustomerAccess) private readonly customers: CustomerAccess,
  ) {}
  @Get() read(
    @Req() r: AuthRequest,
    @Param('businessId', new ParseUUIDPipe()) b: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.scope.run(requestActor(r), b, 'customers.read', async (ctx) => {
      if (!hasPermission(ctx.business, 'products.read')) throw new ForbiddenException();
      await this.customers.get(ctx, id);
      const rows = (
        await ctx.tx.query<{ startsAt: Date; endsAt: Date | null }>(
          `SELECT ${priceProjection},customer_id AS "customerId" FROM price_entries WHERE business_id=$1 AND customer_id=$2 ORDER BY starts_at DESC,id LIMIT 100`,
          [b, id],
        )
      ).rows;
      return { prices: rows.map(periodWire) };
    });
  }
}
