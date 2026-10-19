import { z } from 'zod';
import { apiOriginSchema } from '@inventory/contracts';

const desktopOrigins = [
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
] as const;
const originSchema = z.union([apiOriginSchema, z.enum(desktopOrigins)]);

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  DATABASE_URL: z.url().refine((value) => /^postgres(?:ql)?:\/\//.test(value)),
  DATABASE_SSL: z.enum(['disable', 'verify-full']).default('disable'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
});

export function parseEnvironment(input: Record<string, unknown>) {
  const parsed = environmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment keys: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
    );
  }
  const env = parsed.data;
  const parsedOrigins = z
    .array(originSchema)
    .safeParse(env.CORS_ORIGINS.split(',').map((value) => value.trim()));
  if (!parsedOrigins.success)
    throw new Error('CORS_ORIGINS must contain explicit HTTP(S) or packaged desktop origins.');
  const corsOrigins = parsedOrigins.data;
  // Do not allow URL query options to override certificate verification.
  if (new URL(env.DATABASE_URL).search)
    throw new Error('DATABASE_URL query options are not supported.');
  if (env.NODE_ENV === 'production') {
    if (env.DATABASE_SSL !== 'verify-full')
      throw new Error('Production requires verified database TLS.');
    if (
      !corsOrigins.every(
        (origin) =>
          origin.startsWith('https://') || desktopOrigins.some((allowed) => allowed === origin),
      )
    ) {
      throw new Error('Production requires HTTPS CORS origins.');
    }
  }
  return { ...env, corsOrigins };
}

export type Environment = ReturnType<typeof parseEnvironment>;
export const ENVIRONMENT = Symbol('ENVIRONMENT');
