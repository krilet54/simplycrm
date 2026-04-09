// src/lib/rate-limit.ts
// Rate limiting DISABLED to conserve Upstash free tier
// The presence tracking feature exhausted the monthly limit
// Re-enable when upgrading or next billing cycle

import { NextRequest, NextResponse } from 'next/server';

export type RateLimitType = 'general' | 'strict' | 'auth';

/**
 * Rate limiting is currently DISABLED
 * Returns null (allow all requests)
 */
export async function checkRateLimit(
  req: NextRequest,
  type: RateLimitType = 'general',
  userId?: string
): Promise<NextResponse | null> {
  // Rate limiting disabled - allow all requests
  return null;
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 * Currently passes through without rate limiting
 */
export function withRateLimit<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T,
  type: RateLimitType = 'general'
): T {
  return handler;
}

/**
 * Rate limit configuration - kept for reference
 */
export const RATE_LIMIT_CONFIG: Record<string, RateLimitType> = {
  '/api/auth': 'auth',
  '/api/onboarding': 'auth',
  '/api/workspace/join': 'auth',
  '/api/workspace/invite': 'auth',
  '/api/csv/import': 'strict',
  '/api/csv/export': 'strict',
  '/api/workspace': 'strict',
  '/api/contacts': 'general',
  '/api/tasks': 'general',
};

export function getRateLimitType(pathname: string): RateLimitType {
  return 'general';
}
