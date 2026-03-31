// src/lib/auth.ts
import { createSupabaseServerClient } from './supabase-server';
import { db } from './db';
import { redirect } from 'next/navigation';

export async function getAuthenticatedUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  const dbUser = await db.user.findUnique({
    where: { supabaseId: user.id },
    include: { workspace: true },
  });

  if (!dbUser) {
    redirect('/onboarding');
  }

  return { supabaseUser: user, dbUser, workspace: dbUser.workspace };
}

export async function getWorkspaceFromRequest(req: Request) {
  // For API routes, we accept workspace ID in header or derive from user
  const workspaceId = req.headers.get('x-workspace-id');
  if (!workspaceId) return null;

  return db.workspace.findUnique({ where: { id: workspaceId } });
}
