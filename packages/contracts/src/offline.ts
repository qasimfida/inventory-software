import { z } from 'zod';
import { currencySchema, positiveQuantitySchema } from './conventions.js';
import { nonnegativeMinorSchema } from './customers.js';
import { cartLineSchema } from './sales.js';
export const offlinePolicySchema = z
  .object({
    enabled: z.boolean().default(false),
    leaseMinutes: z.number().int().min(5).max(480).default(60),
    maxSaleMinor: nonnegativeMinorSchema.default('100000'),
    maxLeaseMinor: nonnegativeMinorSchema.default('500000'),
    maxDiscountBasisPoints: z.number().int().min(0).max(10000).default(0),
    allowCredit: z.literal(false).default(false),
    paymentMethod: z.literal('cash').default('cash'),
    requireCachedStock: z.boolean().default(true),
    pricePolicy: z.enum(['reject_changed', 'honor_snapshot']).default('reject_changed'),
    maxLineQuantity: positiveQuantitySchema.default('100'),
    version: z.number().int().positive().default(1),
  })
  .strict();
export const offlineItemSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  sku: z.string(),
  barcodes: z.array(z.string()),
  trackInventory: z.boolean(),
  units: z.array(
    z.object({ id: z.uuid(), code: z.string(), numerator: z.string(), denominator: z.string() }),
  ),
  priceId: z.uuid(),
  unitPrice: z.string(),
  currency: currencySchema,
  taxBasisPoints: z.number().int(),
  taxInclusive: z.boolean(),
  promotions: z.array(
    z.object({ id: z.uuid(), discountBasisPoints: z.number().int(), minimumQuantity: z.string() }),
  ),
  available: z.string(),
});
export const snapshotSchema = z.object({
  warehouseId: z.uuid(),
  storeId: z.uuid(),
  currency: currencySchema,
  revision: z.string(),
  items: z.array(offlineItemSchema),
  cursor: z.uuid(),
});
export const leaseSchema = z.object({
  id: z.uuid(),
  businessId: z.uuid(),
  actorId: z.uuid(),
  deviceId: z.uuid(),
  warehouseId: z.uuid(),
  shiftId: z.uuid(),
  currency: currencySchema,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  policy: offlinePolicySchema,
  snapshot: snapshotSchema,
});
export const prepareOfflineSchema = z
  .object({ warehouseId: z.uuid(), currency: currencySchema, deviceId: z.uuid() })
  .strict();
export const offlineSaleSchema = z
  .object({
    id: z.uuid(),
    leaseId: z.uuid(),
    occurredAt: z.iso.datetime(),
    kind: z.literal('sale'),
    lines: z.array(cartLineSchema).min(1).max(50),
    cashReceivedMinor: nonnegativeMinorSchema,
    totalMinor: nonnegativeMinorSchema,
  })
  .strict();
export const uploadSchema = z
  .object({ operations: z.array(offlineSaleSchema).min(1).max(20) })
  .strict();
export const syncResultSchema = z.object({
  id: z.uuid(),
  state: z.enum(['synced', 'rejected', 'conflict']),
  code: z.string(),
  saleId: z.uuid().optional(),
});
export const uploadResultSchema = z.object({ results: z.array(syncResultSchema) });
export const deltaQuerySchema = z
  .object({ warehouseId: z.uuid(), currency: currencySchema, cursor: z.uuid().optional() })
  .strict();
export const deltaSchema = z.object({
  actorId: z.uuid(),
  cursor: z.uuid(),
  revision: z.string(),
  reset: z.boolean(),
  replaceAll: z.boolean(),
  items: z.array(offlineItemSchema),
  removed: z.array(z.uuid()),
  topics: z.array(z.string()),
});
export const eventQuerySchema = deltaQuerySchema
  .omit({ cursor: true })
  .extend({ after: z.string().regex(/^[0-9]{1,18}$/) });
export type OfflinePolicy = z.infer<typeof offlinePolicySchema>;
export type OfflineItem = z.infer<typeof offlineItemSchema>;
export type OfflineLease = z.infer<typeof leaseSchema>;
export type OfflineSale = z.infer<typeof offlineSaleSchema>;
export type OfflineSnapshot = z.infer<typeof snapshotSchema>;
export type SyncResult = z.infer<typeof syncResultSchema>;
export type DeltaQuery = z.infer<typeof deltaQuerySchema>;
