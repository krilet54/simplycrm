import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';

const signupSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

function isDuplicateUserError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('already') || normalized.includes('registered') || normalized.includes('exists');
}

function isConfirmationEmailError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('error sending confirmation email');
}

function getConfiguredAppOrigin() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null;

  try {
    return new URL(appUrl).origin;
  } catch {
    return null;
  }
}

function buildEmailRedirectTo(req: NextRequest) {
  const configuredOrigin = getConfiguredAppOrigin();
  const origin = configuredOrigin ?? req.nextUrl.origin;
  return `${origin}/auth/callback`;
}

function createSupabaseAnonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const startedAt = performance.now();

  const rateLimitResponse = await checkRateLimit(req, 'auth');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const payload = await req.json();
    const parsed = signupSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Authentication service is not configured correctly' },
        { status: 500 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = createSupabaseAnonClient();
    const emailRedirectTo = buildEmailRedirectTo(req);

    let { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          signupMethod: 'web',
        },
      },
    });

    // If redirect URL config is invalid in Supabase allowlist, retry with project SITE_URL.
    if (error && isConfirmationEmailError(error.message)) {
      const retry = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            signupMethod: 'web',
          },
        },
      });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (isDuplicateUserError(error.message)) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }

      console.error('Signup signUp failed:', error.message);
      if (isConfirmationEmailError(error.message)) {
        return NextResponse.json(
          {
            error:
              'Supabase could not send the verification email. Please verify Auth Email settings and redirect URLs in Supabase dashboard.',
          },
          { status: 502 }
        );
      }

      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    return NextResponse.json(
      {
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        emailConfirmed: false,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('POST /api/auth/signup unexpected error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  } finally {
    const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
    if (durationMs > 700) {
      console.warn(`[API Slow] auth.signup took ${durationMs}ms`);
    }
  }
}
