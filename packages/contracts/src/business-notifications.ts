import { z } from 'zod';
export const notificationQuerySchema = z
  .object({
    search: z.string().trim().max(120).default(''),
    status: z.enum(['all', 'read', 'unread']).default('all'),
    cursor: z
      .string()
      .regex(/^\d{1,18}$/)
      .optional(),
  })
  .strict();
export const businessInboxSchema = z
  .object({
    notifications: z
      .array(
        z
          .object({
            id: z.uuid(),
            event: z.string(),
            resourceId: z.uuid(),
            createdAt: z.iso.datetime(),
            readAt: z.iso.datetime().nullable(),
            warehouseId: z.uuid().nullable(),
          })
          .strict(),
      )
      .max(50),
    nextCursor: z.string().nullable(),
  })
  .strict();
export const approvalQueueSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.uuid(),
            kind: z.enum(['purchase', 'transfer', 'count']),
            reference: z.string(),
            state: z.string(),
            version: z.number().int(),
            warehouseId: z.uuid(),
          })
          .strict(),
      )
      .max(50),
    hasMore: z.boolean(),
    offset: z.number().int(),
  })
  .strict();
export const queueQuerySchema = z
  .object({ offset: z.coerce.number().int().min(0).max(100000).default(0) })
  .strict();
export const businessFailuresSchema = z
  .object({
    deliveries: z
      .array(
        z
          .object({
            id: z.uuid(),
            event: z.string(),
            state: z.enum(['pending', 'failed']),
            attempts: z.number().int(),
            failureCode: z.string().nullable(),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();
