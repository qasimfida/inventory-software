import { getLocation } from '../organization/location.repository.js';
import { Inject, Injectable } from '@nestjs/common';
import { dashboardSchema, defaultIndustry, hasPermission } from '@inventory/contracts';
import type { DashboardQuery } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { readPolicy } from '../settings/settings-store.js';
import { dashboardInventory, dashboardSales } from './dashboard-queries.js';
@Injectable()
export class DashboardService {
  constructor(@Inject(OrganizationScope) private readonly scope: OrganizationScope) {}
  load(actor: Actor, businessId: string, query: DashboardQuery) {
    return this.scope.run(actor, businessId, 'reports.read', async (ctx) => {
      if (query.storeId) await getLocation(ctx, 'stores', query.storeId);
      for (const id of query.warehouseIds ?? []) await getLocation(ctx, 'warehouses', id);
      const now = new Date(),
        to = now.toISOString().slice(0, 10);
      const day = Date.parse(to),
        date = (offset: number) => new Date(day + offset * 86400000).toISOString().slice(0, 10);
      const from = date(1 - query.days);
      const args = [
        businessId,
        query.storeId ?? ctx.business.scope?.storeId ?? null,
        query.warehouseIds ??
          (ctx.business.scope?.warehouseId ? [ctx.business.scope.warehouseId] : null),
      ];
      let sales: unknown = null,
        inventory: unknown = null;
      if (hasPermission(ctx.business, 'sales.read')) {
        sales = (
          await ctx.tx.query<{ data: unknown }>(dashboardSales, [
            ...args,
            query.currency,
            from,
            to,
            date(1 - query.days * 2),
          ])
        ).rows[0]?.data;
      }
      if (hasPermission(ctx.business, 'stock.read')) {
        const threshold =
          (await readPolicy(ctx.tx, businessId)).values.industry?.lowStockThreshold ??
          defaultIndustry.lowStockThreshold;
        inventory = (
          await ctx.tx.query<{ data: unknown }>(dashboardInventory, [...args, threshold])
        ).rows[0]?.data;
      }
      return dashboardSchema.parse({
        currency: query.currency,
        from,
        to,
        asOf: now.toISOString(),
        sales,
        inventory,
      });
    });
  }
}
