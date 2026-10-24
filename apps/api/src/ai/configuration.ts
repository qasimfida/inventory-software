import { z } from 'zod';
const schema = z.object({
  AI_PROVIDER: z
    .string()
    .regex(/^[a-z][a-z0-9-]{0,47}$/)
    .default('disabled'),
  AI_MODEL: z
    .string()
    .regex(/^[\w./:-]{1,100}$/)
    .optional(),
  AI_API_KEY: z.string().min(1).max(4096).optional(),
  AI_TIMEOUT_MS: z.coerce.number().int().min(100).max(30000).default(10000),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(64).max(2048).default(512),
});
export function parseAiConfiguration(input: Record<string, unknown>) {
  const parsed = schema.safeParse({
    ...input,
    AI_MODEL: input.AI_MODEL || undefined,
    AI_API_KEY: input.AI_API_KEY || undefined,
  });
  if (!parsed.success)
    throw new Error('Invalid AI configuration. Check server AI environment keys.');
  const value = parsed.data;
  if (value.AI_PROVIDER !== 'disabled' && (!value.AI_MODEL || !value.AI_API_KEY))
    throw new Error('Enabled AI requires server model and credential configuration.');
  return value;
}
export type AiConfiguration = ReturnType<typeof parseAiConfiguration>;
