// src/app/api/agents/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { createSupabaseServiceClient } from '@/lib/supabase-server';
import { z } from 'zod';

async function getUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return db.user.findUnique({ where: { supabaseId: user.id } });
}

// ── GET /api/agents ───────────────────────────────────────────────────────────
export async function GET() {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Use raw SQL to include phoneNumber (bypasses Prisma type issues)
    const agents = await db.$queryRaw<Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      phoneNumber: string | null;
      isOnline: boolean;
      createdAt: Date;
    }>>`
      SELECT "id", "name", "email", "role", "avatarUrl", "phoneNumber", "isOnline", "createdAt"
      FROM "users"
      WHERE "workspaceId" = ${dbUser.workspaceId}
      ORDER BY "name" ASC
    `;

    return NextResponse.json({ agents });
  } catch (error: any) {
    // If phoneNumber column doesn't exist, fallback to Prisma
    if (error.message?.includes('phoneNumber') || error.message?.includes('column')) {
      const agents = await db.user.findMany({
        where: { workspaceId: dbUser.workspaceId },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true, isOnline: true, createdAt: true },
        orderBy: { name: 'asc' },
      });
      // Add null phoneNumber to each agent
      const agentsWithPhone = agents.map(a => ({ ...a, phoneNumber: null }));
      return NextResponse.json({ agents: agentsWithPhone });
    }
    
    console.error('Failed to fetch agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

// ── POST /api/agents - invite a new team member ───────────────────────────────
const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['ADMIN', 'AGENT']).default('AGENT'),
});

export async function POST(req: NextRequest) {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check plan limits
  const workspace = await db.workspace.findUnique({ where: { id: dbUser.workspaceId } });
  const agentCount = await db.user.count({ where: { workspaceId: dbUser.workspaceId } });

  const limits: Record<string, number> = { TRIAL: 2, STARTER: 3, PRO: 999 };
  const limit = limits[workspace?.plan ?? 'STARTER'] ?? 3;

  if (agentCount >= limit) {
    return NextResponse.json({
      error: `Your ${workspace?.plan} plan allows up to ${limit} team members. Upgrade to add more.`,
    }, { status: 403 });
  }

  const parsed = inviteSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Check if already exists
  const existing = await db.user.findFirst({
    where: { email: parsed.data.email, workspaceId: dbUser.workspaceId },
  });
  if (existing) {
    return NextResponse.json({ error: 'User already in workspace' }, { status: 409 });
  }

  // Invite via Supabase Auth (sends email)
  const supabaseAdmin = createSupabaseServiceClient();
  const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?workspace=${dbUser.workspaceId}` }
  );

  if (inviteErr) {
    return NextResponse.json({ error: inviteErr.message }, { status: 500 });
  }

  // Create pending user record
  const agent = await db.user.create({
    data: {
      workspaceId: dbUser.workspaceId,
      supabaseId: inviteData.user.id,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
    },
  });

  return NextResponse.json({ agent }, { status: 201 });
}
