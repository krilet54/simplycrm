/**
 * src/lib/security.ts
 * Security utilities including input validation, CORS, CSP headers
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';

/**
 * Verify webhook signature from payment provider
 * Supports Stripe and Razorpay signatures
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
  provider: 'stripe' | 'razorpay'
): Promise<boolean> {
  try {
    if (provider === 'stripe') {
      // Stripe uses HMAC SHA256
      const hash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      return `t=${Date.now()},v1=${hash}`.split(',').some(part => {
        const [algorithm, value] = part.split('=');
        if (algorithm === 'v1') {
          return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(hash));
        }
        return false;
      });
    }

    if (provider === 'razorpay') {
      // Razorpay uses HMAC SHA256 on body + signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    }

    return false;
  } catch (error) {
    console.error(`Webhook verification failed for ${provider}:`, error);
    return false;
  }
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove basic HTML tags
    .trim()
    .slice(0, 1000); // Limit length
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions policy (formerly Feature-Policy)
  response.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  // HSTS for HTTPS enforcement (only in production)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains'
    );
  }

  return response;
}

/**
 * Create CORS headers for API responses
 * Restrict to your own domain in production
 */
export function getCORSHeaders(origin?: string): Record<string, string> {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
  ];

  const isAllowed = origin && allowedOrigins.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Workspace-ID',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '3600',
  };
}

/**
 * Rate limit response
 */
export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 }
  );
}

/**
 * Unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Forbidden response
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Bad request response
 */
export function badRequestResponse(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Server error response (for logging)
 */
export function serverErrorResponse(
  error: unknown,
  context?: string
): NextResponse {
  if (error instanceof z.ZodError) {
    return badRequestResponse(
      `Validation error: ${error.errors[0].message}`
    );
  }

  console.error(`[${context || 'API Error'}]`, error);
  
  // Don't expose internal errors in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error instanceof Error
      ? error.message
      : 'Unknown error';

  return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Create a secure API handler wrapper
 */
export function createSecureApiHandler<T extends Record<string, unknown>>(
  schema: z.ZodSchema<T>,
  handler: (data: T, req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    try {
      // Validate request method
      if (req.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 204,
          headers: getCORSHeaders(req.headers.get('origin') || undefined),
        });
      }

      // Validate content type for mutations
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const contentType = req.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          return badRequestResponse('Content-Type must be application/json');
        }
      }

      // Parse body if present
      let body: T;
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        const rawBody = await req.json();
        const parsed = schema.safeParse(rawBody);

        if (!parsed.success) {
          return badRequestResponse(
            `Validation error: ${parsed.error.errors[0].message}`
          );
        }
        body = parsed.data;
      } else {
        body = {} as T;
      }

      // Call handler
      const response = await handler(body, req);

      // Add security headers
      return addSecurityHeaders(response);
    } catch (error) {
      return serverErrorResponse(error, 'SecureApiHandler');
    }
  };
}
