import { z } from 'zod';
import type { OrganizationTransport } from './organization.js';
import { createPurchasingClient } from './purchasing.js';
import { createTransferClient } from './transfers.js';
import { createCountClient } from './counts.js';
export function createApprovalReviewClient(
  request: OrganizationTransport,
  newKey: () => string,
  businessId: string,
) {
  const purchase = createPurchasingClient(request, newKey, businessId),
    transfer = createTransferClient(request, newKey, businessId),
    count = createCountClient(request, newKey, businessId);
  const reason = (value: string) => z.string().trim().min(10).max(240).parse(value);
  return {
    load: async (kind: 'purchase' | 'transfer' | 'count', id: string) => {
      if (kind === 'purchase') {
        const detail = await purchase.detail(id),
          order = detail.order;
        return {
          state: order.state,
          title: `Purchase ${order.reference}`,
          details: [
            `Warehouse ${order.warehouseId} · ${order.currency}`,
            ...detail.lines.map(
              (l) =>
                `${l.variantId}: ${l.quantity} of unit ${l.unitId} at ${l.unitCost} ${order.currency} each`,
            ),
          ],
          approve:
            order.state === 'draft'
              ? (value: string) =>
                  purchase.transition(id, {
                    action: 'approve',
                    version: order.version,
                    reason: reason(value),
                  })
              : null,
        };
      }
      if (kind === 'transfer') {
        const detail = await transfer.detail(id),
          document = detail.transfer;
        return {
          state: document.state,
          title: `Transfer ${document.reference}`,
          details: [
            `From warehouse ${document.sourceWarehouseId} to ${document.destinationWarehouseId}`,
            ...detail.lines.map(
              (l) =>
                `${l.variantId}: ${l.quantity} of unit ${l.unitId} (${l.baseQuantity} base units)`,
            ),
          ],
          approve:
            document.state === 'draft'
              ? (value: string) =>
                  transfer.transition(id, {
                    action: 'approve',
                    version: document.version,
                    reason: reason(value),
                  })
              : null,
        };
      }
      const detail = await count.detail(id),
        document = detail.count;
      return {
        state: document.state,
        title: 'Stock count review',
        details: [
          `Warehouse ${document.warehouseId} · location ${document.locationId}`,
          ...detail.lines.map(
            (l) =>
              `${l.sku}: expected ${l.expected ?? 'hidden'}, counted ${l.counted ?? 'missing'} base units${l.stale ? ' — recount required' : ''}`,
          ),
        ],
        approve:
          document.state === 'review' && detail.lines.every((l) => !l.stale)
            ? (value: string) =>
                count.transition(id, 'approve', {
                  version: document.version,
                  reason: reason(value),
                })
            : null,
      };
    },
  };
}
