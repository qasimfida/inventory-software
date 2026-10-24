import { z } from 'zod';
export const authMutationSchema = z.object({ ok: z.literal(true) }).strict();

export const sessionSchema = z
  .object({
    user: z.object({ id: z.uuid(), email: z.email(), status: z.literal('active') }).strict(),
    sessionId: z.uuid(),
    expiresAt: z.iso.datetime(),
    absoluteExpiresAt: z.iso.datetime(),
  })
  .strict();
export const authResponseSchema = sessionSchema.extend({
  token: z
    .string()
    .regex(/^[A-Za-z0-9_-]{43}$/)
    .optional(),
});
export const sessionsSchema = z
  .object({
    sessions: z.array(
      z
        .object({
          id: z.uuid(),
          createdAt: z.iso.datetime(),
          expiresAt: z.iso.datetime(),
          transport: z.enum(['cookie', 'bearer']),
          deviceId: z.uuid().nullable().optional(),
        })
        .strict(),
    ),
  })
  .strict();
export type Session = z.infer<typeof sessionSchema>;
export type ActiveSession = z.infer<typeof sessionsSchema>['sessions'][number];

export const recoveryStatusSchema = z
  .object({ valid: z.literal(true), expiresAt: z.iso.datetime() })
  .strict();
