import { z } from 'zod';

export const API_PREFIX = '/api/v1';

export const apiOriginSchema = z
  .url({ normalize: true })
  .refine(
    (value) => /^https?:\/\/[^/?#@\s\\]+\/?$/i.test(value),
    'Use an HTTP(S) origin without credentials, query or path.',
  )
  .transform((value) => value.replace(/\/$/, ''));

export const healthResponseSchema = z.object({ status: z.literal('ok') }).strict();
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const apiErrorSchema = z
  .object({
    code: z.enum(['BAD_REQUEST', 'NOT_FOUND', 'UNAVAILABLE', 'INTERNAL_ERROR', 'REQUEST_FAILED']),
    message: z.string(),
    requestId: z.string().uuid(),
    retryable: z.boolean(),
  })
  .strict();
export type ApiErrorResponse = z.infer<typeof apiErrorSchema>;
