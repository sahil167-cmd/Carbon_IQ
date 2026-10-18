import { z } from 'zod';

/**
 * Environment variable schema — validated at process boot.
 * The process refuses to start if any required variable is missing or malformed.
 * Mirrors every variable in .env.example.
 */
const envSchema = z.object({
  // ── Server ─────────────────────────────────────────────────────────────────
  PORT: z
    .string()
    .default('3000')
    .transform(Number)
    .refine((n) => n > 0 && n < 65536, 'PORT must be a valid port number'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── Database ───────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid PostgreSQL connection string'),
  DATABASE_URL_READONLY: z
    .string()
    .optional()
    .default('')
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : '')),

  // ── Redis ──────────────────────────────────────────────────────────────────
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection string'),

  // ── JWT ────────────────────────────────────────────────────────────────────
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_DAYS: z
    .string()
    .default('7')
    .transform(Number)
    .refine((n) => n > 0, 'JWT_REFRESH_EXPIRES_DAYS must be positive'),

  // ── S3 / MinIO ─────────────────────────────────────────────────────────────
  S3_ENDPOINT: z
    .string()
    .optional()
    .default('')
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : '')),
  S3_BUCKET: z.string().default('carbon-os-dev'),
  S3_ACCESS_KEY: z.string().optional().default(''),
  S3_SECRET_KEY: z.string().optional().default(''),
  S3_REGION: z.string().default('us-east-1'),
  S3_FORCE_PATH_STYLE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  // ── SMTP ───────────────────────────────────────────────────────────────────
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z
    .string()
    .default('1025')
    .transform(Number)
    .refine((n) => n > 0 && n < 65536, 'SMTP_PORT must be a valid port'),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().default('CarbonIQ <noreply@carboniq.local>'),

  // ── LLM ────────────────────────────────────────────────────────────────────
  LLM_BASE_URL: z
    .string()
    .optional()
    .default('https://api.openai.com/v1')
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'https://api.openai.com/v1')),
  LLM_API_KEY: z.string().optional().default(''),
  LLM_MODEL: z.string().default('gpt-4o'),

  // ── ML Service ─────────────────────────────────────────────────────────────
  ML_SERVICE_URL: z
    .string()
    .optional()
    .default('http://localhost:8000')
    .transform((val) => {
      if (!val || !val.trim()) return 'http://localhost:8000';
      const trimmed = val.trim();
      return trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `http://${trimmed}`;
    }),

  // ── OCR ────────────────────────────────────────────────────────────────────
  OCR_PROVIDER: z.enum(['tesseract', 'cloud']).default('tesseract'),

  // ── Observability ──────────────────────────────────────────────────────────
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional().default(''),

  // ── Web Origin (CORS) ─────────────────────────────────────────────────────
  WEB_ORIGIN: z.string().optional().default(''),

  // ── Logistics / Routing ───────────────────────────────────────────────────
  OPENROUTESERVICE_API_KEY: z.string().optional().default(''),
  OPENROUTESERVICE_BASE_URL: z
    .string()
    .optional()
    .default('https://api.heigit.org')
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'https://api.heigit.org')),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  [${issue.path.join('.')}] ${issue.message}`)
      .join('\n');

    // Use console.error here — logger may not be initialized yet
    console.error('❌ Invalid environment configuration. Fix these issues before starting:\n' + issues);
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment variables.
 * Imported by any module that needs env access.
 * Modules must NOT read process.env directly — use this object.
 */
export const env = validateEnv();
