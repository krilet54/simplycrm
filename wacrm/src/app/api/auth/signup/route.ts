import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';

const signupSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

function isDuplicateUserError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('already') || normalized.includes('registered') || normalized.includes('exists');
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

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json(
        { error: 'Authentication service is not configured correctly' },
        { status: 500 }
      );
    }

    const { email, password } = parsed.data;
    const supabase = createSupabaseServiceClient();

    // Create a confirmed user to avoid runtime dependency on confirmation email delivery.
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        signupMethod: 'web',
      },
    });

    if (error) {
      if (isDuplicateUserError(error.message)) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
      }

      console.error('Signup createUser failed:', error.message);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    return NextResponse.json(
      {
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
        emailConfirmed: true,
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
