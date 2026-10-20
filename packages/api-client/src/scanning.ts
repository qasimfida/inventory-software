import { z } from 'zod';
import { parseScan } from '@inventory/domain';
import type { OrganizationTransport } from './organization.js';
const product = z.object({
  kind: z.literal('product'),
  id: z.uuid(),
  name: z.string(),
  sku: z.string(),
  units: z.array(z.object({ id: z.uuid(), code: z.string() })),
});
const location = z.object({
  kind: z.literal('location'),
  id: z.uuid(),
  name: z.string(),
  code: z.string(),
});
export function createScanClient(request: OrganizationTransport, businessId: string) {
  return {
    resolve: async (warehouseId: string, kind: 'product' | 'location', raw: string) =>
      z
        .union([product, location])
        .parse(
          await request(
            `/${encodeURIComponent(businessId)}/scans?warehouseId=${encodeURIComponent(warehouseId)}&kind=${kind}&code=${encodeURIComponent(parseScan(raw))}`,
          ),
        ),
  };
}
