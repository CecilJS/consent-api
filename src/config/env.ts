import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(0),

  DATABASE_URL: z.string().startsWith('postgresql://'),
  MONGO_URL: z.string().startsWith('mongodb'),
  MONGO_DB: z.string().min(1),

  JWT_ACCESS_SECRET: z
    .string()
    .regex(/^[0-9a-f]+$/i, 'must be hex: generate with `openssl rand -hex 48`')
    .min(64, 'must be at least 64 hex characters (256 bits)'),
  JWT_ISSUER: z.string().default('consent-api'),
  JWT_AUDIENCE: z.string().default('consent-api-clients'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(14),

  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((s) => s.split(',').map((o) => o.trim()).filter(Boolean)),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast: a misconfigured service should never start serving traffic.
  console.error('Invalid environment configuration:\n' + z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';