// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code        = searchParams.get('code');
  const workspaceId = searchParams.get('workspace');

  if (code) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if DB user exists for this supabase user
      const existing = await db.user.findUnique({
        where: { supabaseId: data.user.id },
      });

      // If invited user (has workspaceId param) and no DB record yet, create one
      if (!existing && workspaceId) {
        const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
        if (workspace) {
          await db.user.create({
            data: {
              supabaseId: data.user.id,
              workspaceId,
              name: data.user.user_metadata?.name ?? data.user.email?.split('@')[0] ?? 'Agent',
              email: data.user.email!,
              role: 'AGENT',
            },
          });
        }
      }

      return NextResponse.redirect(`${origin}/dashboard/inbox`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
