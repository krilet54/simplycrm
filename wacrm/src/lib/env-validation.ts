/**
 * src/lib/env-validation.ts
 * Environment variable validation and typing
 * Ensures all required env vars are present at build/runtime
 */

import { z } from 'zod';

const envSchema = z.object({
  // Database & Supabase (Private)
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Supabase (Public)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),

  // Auth
  NEXTAUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  // Payment Providers
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_STARTER_PRICE_ID: z.string(),
  STRIPE_PRO_PRICE_ID: z.string(),

  // Razorpay
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional().default(''),
  RAZORPAY_SECRET_KEY: z.string().optional().default(''),

  // Email Provider
  RESEND_API_KEY: z.string().startsWith('re_'),
  RESEND_FROM_EMAIL: z.string().email(),

  // Rate Limiting
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // Cron Jobs
  CRON_SECRET: z.string().min(32),

  // Webhooks & Integrations (Optional)
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export function getEnv(): EnvConfig {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues
      .map(issue => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `❌ Missing or invalid environment variables:\n${missing}\n\n` +
      `See .env.example for required variables`
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/**
 * Validate environment variables at startup
 * Call this in your app layout or API initialization
 */
export function validateEnv(): void {
  getEnv(); // Will throw if validation fails
}

/**
 * Check if we're in production mode
 */
export function isProduction(): boolean {
  return getEnv().NODE_ENV === 'production';
}

/**
 * Get public-safe environment info (no secrets)
 */
export function getPublicEnvInfo() {
  const env = getEnv();
  return {
    appUrl: env.NEXT_PUBLIC_APP_URL,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    stripeKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    razorpayKey: env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  };
}
