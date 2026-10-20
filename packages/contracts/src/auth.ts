import { z } from 'zod';

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
        })
        .strict(),
    ),
  })
  .strict();
export type Session = z.infer<typeof sessionSchema>;
export type ActiveSession = z.infer<typeof sessionsSchema>['sessions'][number];
