// src/lib/rate-limit.ts
// Rate Limiting for API routes
// Uses local memory in development, Upstash Redis in production

import { NextRequest, NextResponse } from 'next/server';

export type RateLimitType = 'general' | 'strict' | 'auth' | 'payment';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
}

const RATE_LIMIT_CONFIG: Record<RateLimitType, RateLimitConfig> = {
  auth: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  payment: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute
  strict: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute
  general: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
};

// In-memory store for development (WARNING: doesn't persist across containers in production)
const memoryStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Get rate limit key from request
 * Uses user ID if available, otherwise IP address
 */
function getRateLimitKey(req: NextRequest, userId?: string): string {
  if (userId) return `user:${userId}`;
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
  return `ip:${ip}`;
}

/**
 * Check rate limit using in-memory store (development fallback)
 * NOTE: This does NOT work reliably across multiple Vercel containers!
 * For production, use Upstash Redis instead.
 */
async function checkRateLimitMemory(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    // New window
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { 
      allowed: false, 
      remaining: 0, 
      retryAfter 
    };
  }

  record.count++;
  return { allowed: true, remaining: config.maxRequests - record.count };
}

/**
 * Check rate limit using Upstash Redis
 * Recommended for production
 */
async function checkRateLimitRedis(
  key: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  try {
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      console.warn('Upstash Redis not configured, falling back to memory store');
      return checkRateLimitMemory(key, config);
    }

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        config.maxRequests,
        `${config.windowMs}ms`
      ),
    });

    const { success, limit, remaining, reset } = await ratelimit.limit(key);

    return {
      allowed: success,
      remaining,
      retryAfter: success ? undefined : Math.ceil((reset - Date.now()) / 1000),
    };
  } catch (error) {
    console.warn('Redis rate limit check failed:', error);
    // Fall back to memory store
    return checkRateLimitMemory(key, config);
  }
}

/**
 * Main rate limit check function
 */
export async function checkRateLimit(
  req: NextRequest,
  type: RateLimitType = 'general',
  userId?: string
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === 'development' && !process.env.UPSTASH_REDIS_REST_URL) {
    // Disable rate limiting in dev without Redis
    return null;
  }

  try {
    const key = getRateLimitKey(req, userId);
    const config = RATE_LIMIT_CONFIG[type];

    const result = process.env.UPSTASH_REDIS_REST_URL
      ? await checkRateLimitRedis(key, config)
      : await checkRateLimitMemory(key, config);

    if (!result.allowed) {
      const headers = new Headers();
      if (result.retryAfter) {
        headers.set('Retry-After', String(result.retryAfter));
      }

      return new NextResponse(
        JSON.stringify({
          error: 'Too many requests. Please try again later.',
        }),
        {
          status: 429,
          headers: {
            ...Object.fromEntries(headers),
            'X-RateLimit-Limit': String(config.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Date.now() + (result.retryAfter || 60) * 1000),
          },
        }
      );
    }

    return null;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow request to proceed
    return null;
  }
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  type: RateLimitType = 'general'
): T {
  return (async (req: NextRequest, ...args) => {
    const rateLimitResponse = await checkRateLimit(req, type);
    if (rateLimitResponse) return rateLimitResponse;
    return handler(req, ...args);
  }) as T;
}

/**
 * Route to rate limit mapping
 */
export const ROUTE_RATE_LIMITS: Record<string, RateLimitType> = {
  '/api/auth': 'auth',
  '/api/onboarding': 'auth',
  '/api/workspace/join': 'auth',
  '/api/workspace/invite': 'auth',
  '/api/stripe/checkout': 'payment',
  '/api/stripe/razorpay-checkout': 'payment',
  '/api/stripe/razorpay-verify': 'payment',
  '/api/csv/import': 'strict',
  '/api/csv/export': 'strict',
  '/api/workspace': 'strict',
  '/api/contacts': 'general',
  '/api/tasks': 'general',
  '/api/emails': 'general',
  '/api/invoices': 'general',
};

export function getRateLimitTypeForPath(pathname: string): RateLimitType {
  // Check exact match first
  if (ROUTE_RATE_LIMITS[pathname]) {
    return ROUTE_RATE_LIMITS[pathname];
  }

  // Check prefix match
  for (const [route, type] of Object.entries(ROUTE_RATE_LIMITS)) {
    if (pathname.startsWith(route)) {
      return type;
    }
  }

  return 'general';
}

}
