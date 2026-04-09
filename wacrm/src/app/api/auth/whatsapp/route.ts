import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// Initiate OAuth flow - Generate state token and redirect to Meta's authorization endpoint
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'workspace_id is required' },
        { status: 400 }
      );
    }

    // Get user session
    const supabase = createSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has OWNER or ADMIN role in the workspace
    const workspaceUser = await db.user.findUnique({
      where: {
        supabaseId: user.id,
      },
    });

    if (!workspaceUser || workspaceUser.workspaceId !== workspaceId) {
      return NextResponse.json(
        { error: 'User not in workspace' },
        { status: 403 }
      );
    }

    if (workspaceUser.role !== 'OWNER' && workspaceUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only OWNER and ADMIN can connect WhatsApp' },
        { status: 403 }
      );
    }

    // Generate CSRF state token
    const state = crypto.randomBytes(32).toString('hex');
    const stateExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store state in a simple session (in production, use Redis or DB)
    // For now, we'll pass it back via the callback and validate it
    // In a production setup, you'd store this securely
    const stateKey = `whatsapp_oauth_${workspaceId}`;

    // Build Meta OAuth URL
    const metaAppId = process.env.META_APP_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whatsapp/callback`;

    const metaOAuthUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
    metaOAuthUrl.searchParams.append('client_id', metaAppId!);
    metaOAuthUrl.searchParams.append('redirect_uri', redirectUri);
    metaOAuthUrl.searchParams.append('state', state);
    metaOAuthUrl.searchParams.append('response_type', 'code');
    // WhatsApp specific scopes
    metaOAuthUrl.searchParams.append('scope', 'whatsapp_business_messaging');

    // Create a response that redirects to Meta
    const response = NextResponse.redirect(metaOAuthUrl.toString());

    // Store state token in cookie for validation in callback
    response.cookies.set(`oauth_state_${workspaceId}`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
    });

    response.cookies.set(`oauth_workspace_${workspaceId}`, workspaceId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60, // 5 minutes
    });

    return response;
  } catch (error) {
    console.error('WhatsApp OAuth initiation error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
}
