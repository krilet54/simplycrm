/**
 * src/lib/api-auth.ts
 * API authentication and authorization helpers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from './supabase-server';
import { db } from './db';
import { unauthorizedResponse, forbiddenResponse } from './security';

export interface AuthContext {
  userId: string;
  supabaseId: string;
  email: string;
  role: string;
  workspaceId: string;
}

/**
 * Extract and validate auth from request
 * Returns auth context or error response
 */
export async function getAuthContext(
  req: NextRequest
): Promise<AuthContext | NextResponse> {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return unauthorizedResponse('No valid session');
    }

    const dbUser = await db.user.findUnique({
      where: { supabaseId: user.id },
      select: {
        id: true,
        email: true,
        role: true,
        workspaceId: true,
        supabaseId: true,
      },
    });

    if (!dbUser) {
      return unauthorizedResponse('User not found in database');
    }

    return {
      userId: dbUser.id,
      supabaseId: user.id,
      email: dbUser.email,
      role: dbUser.role,
      workspaceId: dbUser.workspaceId,
    };
  } catch (error) {
    console.error('Auth context error:', error);
    return unauthorizedResponse('Authentication failed');
  }
}

/**
 * Check if user has required role
 */
export function hasRole(auth: AuthContext, roles: string[]): boolean {
  return roles.includes(auth.role);
}

/**
 * Verify workspace access
 */
export async function verifyWorkspaceAccess(
  auth: AuthContext,
  workspaceId: string
): Promise<boolean> {
  if (auth.workspaceId !== workspaceId) {
    return false;
  }

  // Verify workspace still exists
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
  });

  return !!workspace;
}

/**
 * Verify CRON job secret
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!secret || !expectedSecret) {
    return false;
  }

  try {
    // Use timing-safe comparison to prevent timing attacks
    return crypto.subtle
      .timingSafeEqual(
        new TextEncoder().encode(secret),
        new TextEncoder().encode(expectedSecret)
      )
      .then(() => true)
      .catch(() => false);
  } catch {
    return false;
  }
}

/**
 * Higher-order function to protect API routes
 */
export function withAuth(
  handler: (
    req: NextRequest,
    auth: AuthContext
  ) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    const authOrError = await getAuthContext(req);

    if (authOrError instanceof NextResponse) {
      return authOrError;
    }

    try {
      return await handler(req, authOrError);
    } catch (error) {
      console.error('API handler error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Check role authorization
 */
export function requireRole(
  handler: (
    req: NextRequest,
    auth: AuthContext
  ) => Promise<NextResponse>,
  ...roles: string[]
) {
  return withAuth(async (req: NextRequest, auth: AuthContext) => {
    if (!hasRole(auth, roles)) {
      return forbiddenResponse(
        `This action requires ${roles.join(' or ')} role`
      );
    }

    return handler(req, auth);
  });
}

/**
 * Verify workspace header matches user's workspace
 */
export async function verifyWorkspaceHeader(
  req: NextRequest,
  auth: AuthContext
): Promise<boolean> {
  const workspaceId = req.headers.get('x-workspace-id');

  if (!workspaceId) {
    return false;
  }

  return verifyWorkspaceAccess(auth, workspaceId);
}

/**
 * Log API access for audit trail
 */
export async function logApiAccess(
  auth: AuthContext,
  method: string,
  path: string,
  statusCode: number
): Promise<void> {
  try {
    // Optional: Send to external logging service
    console.log(`[API Access] ${auth.userId} ${method} ${path} - ${statusCode}`);
  } catch (error) {
    console.error('Failed to log API access:', error);
  }
}
