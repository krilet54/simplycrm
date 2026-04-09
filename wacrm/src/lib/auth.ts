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

  // Fetch user with workspace in ONE query including phoneNumber
  const dbUserResult = await db.$queryRaw<Array<{
    id: string;
    supabaseId: string;
    name: string | null;
    email: string;
    role: string;
    avatarUrl: string | null;
    phoneNumber: string | null;
    isOnline: boolean;
    createdAt: Date;
    updatedAt: Date;
    workspaceId: string;
  }>>`
    SELECT "id", "supabaseId", "name", "email", "role", "avatarUrl", "phoneNumber", "isOnline", "createdAt", "updatedAt", "workspaceId"
    FROM "users"
    WHERE "supabaseId" = ${user.id}
    LIMIT 1
  `.catch(() => null);

  const dbUserRow = dbUserResult?.[0];
  
  if (!dbUserRow) {
    redirect('/onboarding');
  }

  // Fetch workspace separately (simpler, avoids complex JOIN)
  const workspace = await db.workspace.findUnique({
    where: { id: dbUserRow.workspaceId },
  });

  if (!workspace) {
    redirect('/onboarding');
  }

  // Merge into expected structure
  const dbUser = {
    ...dbUserRow,
    workspace,
  };

  return { supabaseUser: user, dbUser, workspace };
}

export async function getWorkspaceFromRequest(req: Request) {
  // For API routes, we accept workspace ID in header or derive from user
  const workspaceId = req.headers.get('x-workspace-id');
  if (!workspaceId) return null;

  return db.workspace.findUnique({ where: { id: workspaceId } });
}
