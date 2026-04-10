import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from '@/lib/rate-limit';
import { createSupabaseServiceClient } from '@/lib/supabase-server';

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

function buildRedirectCandidates(req: NextRequest) {
  const candidates: string[] = [];
  const requestOrigin = req.nextUrl.origin;
  const configuredOrigin = getConfiguredAppOrigin();

  if (requestOrigin) {
    candidates.push(`${requestOrigin}/auth/callback`);
  }

  if (configuredOrigin && configuredOrigin !== requestOrigin) {
    candidates.push(`${configuredOrigin}/auth/callback`);
  }

  return candidates;
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

async function sendResendVerificationEmail(to: string, confirmationUrl: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured for fallback delivery');
  }

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const result = await resend.emails.send({
    from,
    to,
    subject: 'Confirm your email to finish signing up',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
        <h2 style="margin-bottom: 12px;">Confirm your email</h2>
        <p style="line-height: 1.6; margin-bottom: 16px;">
          Click the button below to verify your email address and complete your account setup.
        </p>
        <p style="margin: 24px 0;">
          <a href="${confirmationUrl}" style="display: inline-block; background: #166534; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
            Verify Email
          </a>
        </p>
        <p style="line-height: 1.6; font-size: 13px; color: #6b7280;">
          If the button does not work, copy this link into your browser:<br />
          <a href="${confirmationUrl}">${confirmationUrl}</a>
        </p>
      </div>
    `,
  });

  if ((result as any)?.error) {
    throw new Error((result as any).error.message || 'Resend fallback email failed');
  }
}

async function sendVerificationFallbackEmail(params: {
  email: string;
  password: string;
  redirectCandidates: string[];
}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured for fallback link generation');
  }

  const supabaseAdmin = createSupabaseServiceClient();
  const redirectOptions: Array<string | undefined> = [...params.redirectCandidates, undefined];
  let actionLink: string | null = null;

  for (const redirectTo of redirectOptions) {
    const payload: any = {
      type: 'signup',
      email: params.email,
      password: params.password,
    };

    if (redirectTo) {
      payload.options = { redirectTo };
    }

    const { data, error } = await supabaseAdmin.auth.admin.generateLink(payload);

    if (!error && data?.properties?.action_link) {
      actionLink = data.properties.action_link;
      break;
    }
  }

  if (!actionLink) {
    throw new Error('Unable to generate fallback verification link');
  }

  await sendResendVerificationEmail(params.email, actionLink);
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
    const redirectCandidates = buildRedirectCandidates(req);

    let data: any = null;
    let error: any = null;

    for (const emailRedirectTo of redirectCandidates) {
      const attempt = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
          data: {
            signupMethod: 'web',
          },
        },
      });

      data = attempt.data;
      error = attempt.error;

      if (!error || !isConfirmationEmailError(error.message)) {
        break;
      }
    }

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
        try {
          await sendVerificationFallbackEmail({
            email,
            password,
            redirectCandidates,
          });

          return NextResponse.json(
            {
              user: {
                id: data?.user?.id,
                email,
              },
              emailConfirmed: false,
              fallbackDelivery: true,
            },
            { status: 201 }
          );
        } catch (fallbackError: any) {
          console.error('Signup fallback verification email failed:', fallbackError?.message || fallbackError);
        }

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
