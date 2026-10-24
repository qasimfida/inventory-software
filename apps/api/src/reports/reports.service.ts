import { Inject, Injectable } from '@nestjs/common';
import { defaultIndustry, hasPermission, reportSchema } from '@inventory/contracts';
import type { Permission, ReportQuery } from '@inventory/contracts';
import { OrganizationScope } from '../organization/organization.scope.js';
import type { Actor } from '../organization/organization.scope.js';
import { requirePermission } from '../organization/access.js';
import { LocationAccess } from '../organization/location-access.js';
import { readPolicy } from '../settings/settings-store.js';
import {
  salesReport,
  purchasesReport,
  paymentsReport,
  supplierPaymentsReport,
  receivablesReport,
  payablesReport,
} from './financial-queries.js';
import { inventoryReport, movementReport } from './stock-queries.js';
const permissions: Record<ReportQuery['section'], Permission[]> = {
  sales: ['sales.read'],
  purchases: ['purchases.read'],
  payments: ['payments.read'],
  receivables: ['customers.read', 'payments.read'],
  payables: ['purchases.read', 'payments.read'],
  inventory: ['stock.read'],
  movements: ['stock.read'],
};
@Injectable()
export class ReportsService {
  constructor(
    @Inject(OrganizationScope) private readonly scope: OrganizationScope,
    @Inject(LocationAccess) private readonly locations: LocationAccess,
  ) {}
  load(actor: Actor, b: string, q: ReportQuery) {
    return this.scope.run(actor, b, 'reports.read', async (ctx) => {
      for (const permission of permissions[q.section]) requirePermission(ctx.business, permission);
      if (q.warehouseId) await this.locations.warehouse(ctx, q.warehouseId);
      const profile = (await readPolicy(ctx.tx, b)).values.industry ?? defaultIndustry;
      const sql = {
        sales: salesReport,
        purchases: purchasesReport,
        payments:
          paymentsReport +
          (hasPermission(ctx.business, 'purchases.read') ? supplierPaymentsReport : ''),
        receivables: receivablesReport,
        payables: payablesReport,
        inventory: inventoryReport,
        movements: movementReport,
      }[q.section];
      const args: unknown[] = [
        b,
        ctx.business.scope?.storeId ?? null,
        ctx.business.scope?.warehouseId ?? null,
        q.warehouseId ?? null,
        q.from,
        q.to,
        q.offset,
      ];
      if (q.section === 'inventory') args.push(q.lowOnly === 'true', profile.lowStockThreshold);
      const rows = (
        await ctx.tx.query(
          `WITH wh AS (SELECT id,business_id,name FROM warehouses WHERE business_id=$1
        AND ($2::uuid IS NULL OR store_id=$2) AND ($3::uuid IS NULL OR id=$3) AND ($4::uuid IS NULL OR id=$4)),
        bounds AS (SELECT $5::date::timestamp AT TIME ZONE 'UTC' AS start,($6::date+1)::timestamp AT TIME ZONE 'UTC' AS finish)
        SELECT * FROM (${sql}) report ORDER BY key LIMIT 51 OFFSET $7`,
          args,
        )
      ).rows;
      return reportSchema.parse({
        section: q.section,
        from: q.from,
        to: q.to,
        asOf: new Date().toISOString(),
        rows: rows.slice(0, 50),
        offset: q.offset,
        hasMore: rows.length > 50,
        notes: [
          'Period flows use inclusive UTC calendar dates. Currencies and base units are never combined.',
          'Inventory and outstanding balances are current, independent of the selected dates. Movement closing balances are historical.',
          'Purchase amounts reflect posted invoices and credits, not estimated order value. Profit and margins are unavailable without historical cost-of-goods allocation.',
          `Low stock means available <= ${profile.lowStockThreshold} base units per SKU/warehouse. Only recorded stock keys are included.`,
        ],
      });
    });
  }
}
