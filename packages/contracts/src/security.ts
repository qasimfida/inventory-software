import { settingsPolicySchema } from './settings.js';
import { z } from 'zod';
export const securityEventSchema = z
  .object({
    id: z.string().regex(/^[0-9]+$/),
    occurredAt: z.iso.datetime(),
    actorId: z.uuid().nullable(),
    businessId: z.uuid().nullable(),
    deviceId: z.uuid().nullable(),
    sessionId: z.uuid().nullable(),
    event: z.string().max(80),
    outcome: z.enum(['success', 'denied', 'failure']),
    requestId: z.uuid(),
    policyChange: z
      .object({ before: settingsPolicySchema, after: settingsPolicySchema })
      .strict()
      .nullable(),
  })
  .strict();
export const securityPageSchema = z
  .object({ events: z.array(securityEventSchema).max(50), nextCursor: z.string().nullable() })
  .strict();
export const securityNotificationSchema = z
  .object({
    id: z.uuid(),
    eventId: z.string(),
    occurredAt: z.iso.datetime(),
    actorId: z.uuid(),
    deviceId: z.uuid(),
    businessId: z.uuid().nullable(),
    audience: z.enum(['self', 'business-admin', 'platform-admin']),
    readAt: z.iso.datetime().nullable(),
  })
  .strict();
export const notificationPageSchema = z
  .object({
    notifications: z.array(securityNotificationSchema).max(50),
    nextCursor: z.string().nullable(),
  })
  .strict();
export const deliveryPageSchema = z
  .object({
    deliveries: z
      .array(
        z
          .object({
            id: z.uuid(),
            eventId: z.string(),
            recipientId: z.uuid(),
            businessId: z.uuid().nullable(),
            state: z.enum(['pending', 'delivered', 'failed']),
            attempts: z.number().int(),
            failureCode: z.string().nullable(),
            nextAttemptAt: z.iso.datetime(),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();
export const diagnosticPageSchema = z
  .object({
    diagnostics: z
      .array(
        z
          .object({
            id: z.uuid(),
            occurredAt: z.iso.datetime(),
            requestId: z.uuid(),
            environment: z.string(),
            applicationVersion: z.string(),
            code: z.string(),
            category: z.string(),
            operation: z.string(),
            severity: z.string(),
            retryable: z.boolean(),
            reason: z.string(),
            recovery: z.string(),
            actorId: z.uuid().nullable(),
          })
          .strict(),
      )
      .max(50),
  })
  .strict();
export type SecurityNotification = z.infer<typeof securityNotificationSchema>;
