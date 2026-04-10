// src/app/api/auth/send-password-reset/route.ts
// Custom password reset endpoint that sends beautiful email templates

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server';
import { sendPasswordResetEmailTemplate, sendTemplateEmail } from '@/lib/email';
import { db } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting - stricter for auth endpoints
    const rateLimitResponse = await checkRateLimit(req, 'auth');
    if (rateLimitResponse) return rateLimitResponse;

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find the user in database
    const dbUser = await db.user.findUnique({
      where: { email },
      include: { workspace: true },
    });

    if (!dbUser) {
      // Security: Don't reveal if user exists or not
      return NextResponse.json({
        success: true,
        message: 'If an account exists, you will receive a password reset email',
      });
    }

    // Use Supabase admin API to send password reset
    const supabaseAdmin = createSupabaseServiceClient();

    // Generate password reset link using Supabase
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      },
    });

    if (error) {
      console.error('Password reset link generation error:', error);
      throw new Error('Failed to generate password reset link');
    }

    if (!data?.properties?.action_link) {
      throw new Error('No action link generated');
    }

    // Send beautiful password reset email using our template
    try {
      const html = sendPasswordResetEmailTemplate({
        recipientName: dbUser.name || email.split('@')[0],
        resetUrl: data.properties.action_link,
        businessName: 'Crebo',
        supportEmail: 'support@crebo.in',
      });

      await sendTemplateEmail({
        to: email,
        subject: 'Reset Your Crebo Password',
        html,
        replyTo: 'support@crebo.in',
      });

      console.log('✅ Password reset email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      throw new Error('Failed to send password reset email');
    }

    // Send success response
    return NextResponse.json({
      success: true,
      message: 'Password reset email sent. Check your inbox within 5 minutes.',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process password reset request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to verify password reset token
 * (Optional: for showing UI feedback on tokens)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Verify the token with Supabase
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'recovery',
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: data.user.email,
      message: 'Token is valid',
    });
  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json(
      { error: 'Token verification failed' },
      { status: 500 }
    );
  }
}
