// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const workspaceId = searchParams.get('workspace');
  const email = searchParams.get('email');
  const role = searchParams.get('role') || 'AGENT';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if DB user exists for this supabase user
      const existing = await db.user.findUnique({
        where: { supabaseId: data.user.id },
      });

      // If invited user (has workspaceId param) and no DB record yet
      if (!existing && workspaceId) {
        const workspace = await db.workspace.findUnique({ where: { id: workspaceId } });
        if (workspace) {
          // Create user in the workspace
          await db.user.create({
            data: {
              supabaseId: data.user.id,
              workspaceId,
              name: data.user.user_metadata?.name ?? data.user.email?.split('@')[0] ?? 'Agent',
              email: data.user.email!,
              role: (role as any) || 'AGENT',
            },
          });

          // Redirect to workspace join onboarding  
          return NextResponse.redirect(`${origin}/workspace-join?workspace=${workspaceId}&first_time=true`);
        }
      }

      // For existing users or regular auth, go to dashboard
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
