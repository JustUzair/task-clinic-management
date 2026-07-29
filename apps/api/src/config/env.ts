import { resolve } from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({
  path: resolve(process.cwd(), "../../.env"),
  quiet: true,
});

const booleanFromString = z.preprocess(value => {
  if (typeof value !== "string") {
    return value;
  }

  if (value.toLowerCase() === "true") {
    return true;
  }

  if (value.toLowerCase() === "false") {
    return false;
  }

  return value;
}, z.boolean());

const envSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  AUTH_MODE: z.enum(["otp", "password"]).default("otp"),
  CLINIC_TIMEZONE: z.literal("Asia/Kolkata").default("Asia/Kolkata"),
  COOKIE_SAME_SITE: z
    .enum(["lax", "strict", "none"])
    .default("lax"),
  COOKIE_SECURE: booleanFromString.default(false),
  DATABASE_URL: z.string().min(1),
  DEMO_AUTH_ENABLED: booleanFromString.default(false),
  DEMO_OTP_CODE: z.string().regex(/^\d{6}$/).default("123456"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  IMPORT_MAX_FILE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(2_097_152),
  IMPORT_MAX_ROWS: z.coerce.number().int().positive().default(10_000),
  MAIL_FROM_EMAIL: z.email(),
  MAIL_FROM_NAME: z.string().trim().min(1),
  MAILTRAP_API_KEY: z.string().min(1),
  MAILTRAP_INBOX_ID: z.string().regex(/^\d+$/),
  MAILTRAP_USE_SANDBOX: booleanFromString.default(true),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  OTP_HMAC_SECRET: z.string().min(32),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_REQUEST_LIMIT: z.coerce.number().int().positive().default(5),
  OTP_REQUEST_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(900),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  SESSION_COOKIE_NAME: z.string().min(1).default("clinic_session"),
  SESSION_JWT_AUDIENCE: z
    .string()
    .min(1)
    .default("clinic-scheduler-web"),
  SESSION_JWT_ISSUER: z.string().min(1).default("clinic-scheduler-api"),
  SESSION_SECRET: z.string().min(32),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().max(86_400),
  SSE_HEARTBEAT_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15_000),
  SSE_RETRY_INTERVAL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(3_000),
  RUN_SEED_ON_START: booleanFromString.default(true),
  SEED_MANAGER_EMAIL: z.string().trim().toLowerCase().email(),
  SEED_MANAGER_NAME: z.string().trim().min(1).max(200),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
  UPSTASH_REDIS_REST_URL: z.url(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  throw new Error(
    `Invalid environment configuration: ${z.prettifyError(result.error)}`,
  );
}

export const env = Object.freeze(result.data);
export type Environment = typeof env;
