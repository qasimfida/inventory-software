import { randomUUID } from 'node:crypto';
import { leaseSchema } from '@inventory/contracts';
import type { VaultRecord, VaultStore } from '../src/offline-store.js';
export function offlineFixture() {
  const variantId = randomUUID(),
    unitId = randomUUID(),
    warehouseId = randomUUID();
  const lease = leaseSchema.parse({
    id: randomUUID(),
    businessId: randomUUID(),
    actorId: randomUUID(),
    deviceId: randomUUID(),
    warehouseId,
    shiftId: randomUUID(),
    currency: 'USD',
    createdAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    policy: { enabled: true },
    snapshot: {
      warehouseId,
      storeId: randomUUID(),
      currency: 'USD',
      revision: '1',
      cursor: randomUUID(),
      items: [
        {
          id: variantId,
          name: 'Test',
          sku: 'TEST',
          barcodes: [],
          trackInventory: true,
          units: [{ id: unitId, code: 'EA', numerator: '1', denominator: '1' }],
          priceId: randomUUID(),
          unitPrice: '10',
          currency: 'USD',
          taxBasisPoints: 0,
          taxInclusive: false,
          promotions: [],
          available: '10',
        },
      ],
    },
  });
  const rows = new Map<string, VaultRecord>();
  const store: VaultStore = {
    read: async (key) => rows.get(key) ?? null,
    compareAndSwap: async (key, expected, envelope) => {
      const row = rows.get(key);
      if ((row?.revision ?? null) !== expected) return false;
      rows.set(key, { revision: (expected ?? 0) + 1, envelope });
      return true;
    },
  };
  const line = { variantId, unitId, quantity: '1', locationId: null, manualDiscountBasisPoints: 0 };
  return { lease, store, line };
}
