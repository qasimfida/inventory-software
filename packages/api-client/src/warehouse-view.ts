import { warehouseViewQuerySchema, warehouseViewSchema } from '@inventory/contracts';
import type { WarehouseViewQuery } from '@inventory/contracts';
import type { OrganizationTransport } from './organization.js';
import { queryString } from './catalog.js';
export function createWarehouseViewClient(request: OrganizationTransport, businessId: string) {
  return {
    load: async (input: WarehouseViewQuery) =>
      warehouseViewSchema.parse(
        await request(
          `/${encodeURIComponent(businessId)}/warehouse-view?${queryString(warehouseViewQuerySchema.parse(input))}`,
        ),
      ),
  };
}
