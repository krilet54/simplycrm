import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Handle OAuth callback - Exchange authorization code for access token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Check for errors from Meta
    if (error) {
      console.error('OAuth error from Meta:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&error=missing_params`
      );
    }

    // The workspaceId should be passed in the state or stored in cookies
    // We'll extract it from the request context or use a different method
    // For this implementation, we'll need to get it from the request cookie set in the initiate step

    // Get workspace from the callback URL if available, or from cookies
    const cookies = request.cookies;
    let workspaceId: string | null = null;

    // Try to find workspace from cookies that start with oauth_workspace_
    for (const [key, value] of Object.entries(cookies.getAll().reduce((acc, cookie) => {
      acc[cookie.name] = cookie.value;
      return acc;
    }, {} as Record<string, string>))) {
      if (key.startsWith('oauth_workspace_')) {
        workspaceId = value;
        break;
      }
    }

    if (!workspaceId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&error=workspace_not_found`
      );
    }

    // Validate state token from cookie
    const storedState = cookies.get(`oauth_state_${workspaceId}`)?.value;
    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&error=invalid_state`
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/whatsapp/callback`,
          code,
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      const error = await tokenResponse.json();
      console.error('Token exchange error:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&error=token_exchange_failed`
      );
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&error=no_access_token`
      );
    }

    // Get phone numbers associated with this user's WhatsApp Business Account
    const phoneNumbersResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/phone_numbers`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!phoneNumbersResponse.ok) {
      console.error('Failed to fetch phone numbers');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&error=phone_fetch_failed`
      );
    }

    const phoneNumbersData = await phoneNumbersResponse.json();
    const phoneNumbers = phoneNumbersData.data;

    if (!phoneNumbers || phoneNumbers.length === 0) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&error=no_phone_numbers`
      );
    }

    // Use the first phone number
    const phoneNumber = phoneNumbers[0];
    const phoneNumberId = phoneNumber.id;

    // Save or update MetaOAuthToken in database
    await db.metaOAuthToken.upsert({
      where: { workspaceId },
      update: {
        accessToken,
        phoneNumberId,
        updatedAt: new Date(),
      },
      create: {
        workspaceId,
        accessToken,
        phoneNumberId,
        connectedAt: new Date(),
      },
    });

    // Delete state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&connected=true`
    );

    response.cookies.delete(`oauth_state_${workspaceId}`);
    response.cookies.delete(`oauth_workspace_${workspaceId}`);

    return response;
  } catch (error) {
    console.error('WhatsApp OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=whatsapp&error=callback_error`
    );
  }
}
