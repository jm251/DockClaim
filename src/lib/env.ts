import { z } from "zod";

const booleanish = z
  .union([z.boolean(), z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "number") {
      return value === 1;
    }

    if (!value) {
      return false;
    }

    return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  });

const envSchema = z.object({
  APP_NAME: z.string().default("DockClaim"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  DEMO_MODE: booleanish.default(true),
  FASTROUTER_API_KEY: z.string().optional(),
  FASTROUTER_API_URL: z.string().url().default("https://go.fastrouter.ai/api/v1/chat/completions"),
  FASTROUTER_MODEL: z.string().default("openai/gpt-5.4"),
  AI_FEATURES_ENABLED: booleanish.default(false),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: booleanish.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_PRO_ID: z.string().optional(),
});

const normalizedProcessEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [
    key,
    typeof value === "string" ? value.trim() : value,
  ]),
);

export const env = envSchema.parse(normalizedProcessEnv);

export const featureFlags = {
  isDemoMode: env.DEMO_MODE,
  isAiEnabled: env.AI_FEATURES_ENABLED && Boolean(env.FASTROUTER_API_KEY),
  isMailConfigured:
    Boolean(env.SMTP_FROM_EMAIL) &&
    Boolean(env.SMTP_HOST) &&
    Boolean(env.SMTP_USER) &&
    Boolean(env.SMTP_PASS),
  isStorageConfigured:
    Boolean(env.CLOUDINARY_API_KEY) &&
    Boolean(env.CLOUDINARY_API_SECRET) &&
    Boolean(env.CLOUDINARY_CLOUD_NAME),
  isStripeConfigured:
    Boolean(env.STRIPE_SECRET_KEY) &&
    Boolean(env.STRIPE_WEBHOOK_SECRET) &&
    Boolean(env.STRIPE_PRICE_PRO_ID),
  isSupabaseConfigured:
    Boolean(env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
};

export const publicEnv = {
  appName: env.APP_NAME,
  appUrl: env.NEXT_PUBLIC_APP_URL,
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  demoMode: env.DEMO_MODE,
};
