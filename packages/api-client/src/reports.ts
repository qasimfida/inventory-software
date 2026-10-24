import { reportQuerySchema, reportSchema, hasPermission } from '@inventory/contracts';
import type { ReportQuery, Business, Permission } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { queryString } from './catalog.js';
export const reportSections: {
  value: ReportQuery['section'];
  label: string;
  permissions: Permission[];
}[] = [
  { value: 'sales', label: 'Sales', permissions: ['sales.read'] },
  { value: 'purchases', label: 'Purchases', permissions: ['purchases.read'] },
  { value: 'payments', label: 'Cash payments', permissions: ['payments.read'] },
  { value: 'receivables', label: 'Receivables', permissions: ['customers.read', 'payments.read'] },
  { value: 'payables', label: 'Payables', permissions: ['purchases.read', 'payments.read'] },
  { value: 'inventory', label: 'Inventory / low stock', permissions: ['stock.read'] },
  { value: 'movements', label: 'Stock movements', permissions: ['stock.read'] },
];
export function availableReports(business: Business) {
  return hasPermission(business, 'reports.read')
    ? reportSections.filter((s) => s.permissions.every((p) => hasPermission(business, p)))
    : [];
}
export function createReportsClient(request: OrganizationTransport, businessId: string) {
  return {
    load: async (input: ReportQuery) =>
      reportSchema.parse(
        await request(
          `/${encodeURIComponent(businessId)}/reports?${queryString(reportQuerySchema.parse(input))}`,
        ),
      ),
  };
}
export function defaultReportDates() {
  const today = new Date();
  return {
    from: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10),
    to: today.toISOString().slice(0, 10),
  };
}
