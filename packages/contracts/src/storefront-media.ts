import { z } from 'zod';
export const onlineImageRequestSchema = z.object({ url: z.string().max(500) }).strict();
export const onlineImageResultSchema = z
  .object({
    status: z.enum(['allowed', 'host_not_allowed', 'not_reachable', 'not_https', 'invalid']),
    message: z.string(),
    dataUrl: z.string().max(2800000).optional(),
  })
  .strict();
