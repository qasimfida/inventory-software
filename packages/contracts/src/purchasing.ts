import { z } from 'zod';
import {
  currencySchema,
  decimalSchema,
  positiveQuantitySchema,
  operationKeySchema,
} from './conventions.js';
export const supplierInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{1,40}$/),
    email: z.union([z.email(), z.literal('')]).default(''),
    phone: z.string().trim().max(80).default(''),
    notes: z.string().trim().max(1000).default(''),
    state: z.enum(['active', 'inactive', 'archived']).default('active'),
  })
  .strict();
export const supplierUpdateSchema = supplierInputSchema.extend({
  version: z.number().int().positive(),
});
export const supplierSchema = supplierInputSchema.extend({
  id: z.uuid(),
  version: z.number().int(),
});
export const purchaseLineInputSchema = z
  .object({
    variantId: z.uuid(),
    unitId: z.uuid(),
    quantity: positiveQuantitySchema,
    unitCost: decimalSchema,
  })
  .strict();
export const purchaseInputSchema = z
  .object({
    supplierId: z.uuid(),
    warehouseId: z.uuid(),
    reference: z.string().trim().min(1).max(80),
    currency: currencySchema,
    lines: z.array(purchaseLineInputSchema).min(1).max(50),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const purchaseTransitionSchema = z
  .object({
    action: z.enum(['approve', 'order', 'cancel']),
    version: z.number().int().positive(),
    reason: z.string().trim().min(3).max(240),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const purchaseReceiveSchema = z
  .object({
    lineId: z.uuid(),
    locationId: z.uuid().nullable().default(null),
    quantity: positiveQuantitySchema,
    damaged: decimalSchema.default('0'),
    damageReason: z.string().trim().max(240).default(''),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const purchaseReturnSchema = z
  .object({
    receiptId: z.uuid(),
    quantity: positiveQuantitySchema,
    damaged: decimalSchema.default('0'),
    reason: z.string().trim().min(3).max(240),
    creditReference: z.string().trim().min(1).max(80),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const supplierInvoiceSchema = z
  .object({
    reference: z.string().trim().min(1).max(80),
    amountMinor: z.string().regex(/^[1-9][0-9]{0,23}$/),
    dueDate: z.iso.date(),
    idempotencyKey: operationKeySchema,
  })
  .strict();
export const purchaseSchema = z.object({
  id: z.uuid(),
  supplierId: z.uuid(),
  warehouseId: z.uuid(),
  currency: currencySchema,
  reference: z.string(),
  state: z.enum(['draft', 'approved', 'ordered', 'partially_received', 'completed', 'cancelled']),
  version: z.number().int(),
  createdAt: z.iso.datetime(),
});
export const purchaseDetailSchema = z.object({
  order: purchaseSchema,
  lines: z.array(
    purchaseLineInputSchema.extend({
      id: z.uuid(),
      baseQuantity: z.string(),
      received: z.string(),
    }),
  ),
  receipts: z.array(
    z.object({
      id: z.uuid(),
      lineId: z.uuid(),
      quantity: z.string(),
      returned: z.string(),
      damaged: z.string(),
      damageReason: z.string(),
      actorId: z.uuid(),
      createdAt: z.string(),
      movementId: z.uuid(),
      locationId: z.uuid(),
    }),
  ),
  returns: z.array(
    z.object({
      id: z.uuid(),
      receiptId: z.uuid(),
      quantity: z.string(),
      movementId: z.uuid(),
      creditReference: z.string(),
      reason: z.string(),
      damaged: z.string(),
    }),
  ),
  invoices: z.array(
    z.object({ id: z.uuid(), reference: z.string(), amountMinor: z.string(), dueDate: z.string() }),
  ),
});
export const purchaseQuerySchema = z
  .object({
    warehouseId: z.uuid(),
    supplierId: z.uuid().optional(),
    search: z.string().trim().max(120).default(''),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const purchaseWorkspaceSchema = z.object({
  suppliers: z.array(supplierSchema),
  orders: z.array(purchaseSchema),
  hasMore: z.boolean(),
  offset: z.number(),
});
export type PurchaseInput = z.infer<typeof purchaseInputSchema>;
export type PurchaseReceive = z.infer<typeof purchaseReceiveSchema>;
export type PurchaseReturn = z.infer<typeof purchaseReturnSchema>;
export type PurchaseTransition = z.infer<typeof purchaseTransitionSchema>;
export type SupplierInput = z.infer<typeof supplierInputSchema>;
export type SupplierInvoice = z.infer<typeof supplierInvoiceSchema>;
export type PurchaseQuery = z.infer<typeof purchaseQuerySchema>;
export type Purchase = z.infer<typeof purchaseSchema>;

export const purchaseAddLineSchema = purchaseLineInputSchema.extend({
  version: z.number().int().positive(),
  idempotencyKey: operationKeySchema,
});
export type PurchaseAddLine = z.infer<typeof purchaseAddLineSchema>;
