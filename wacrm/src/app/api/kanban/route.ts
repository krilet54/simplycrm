// src/app/api/kanban/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

async function getUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return db.user.findUnique({ where: { supabaseId: user.id } });
}

// ── GET /api/kanban  - full board with contacts per stage ─────────────────────
export async function GET() {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stages = await db.kanbanStage.findMany({
    where: { workspaceId: dbUser.workspaceId },
    orderBy: { position: 'asc' },
    include: {
      contacts: {
        orderBy: { lastActivityAt: { sort: 'desc', nulls: 'last' } },
        include: {
          contactTags: { include: { tag: true } },
          _count: { select: { activities: true } },
        },
      },
    },
  });

  return NextResponse.json({ stages });
}

// ── POST /api/kanban  - create a new stage ─────────────────────────────────────
const createStageSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function POST(req: NextRequest) {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (dbUser.role === 'AGENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createStageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const maxPos = await db.kanbanStage.aggregate({
    where: { workspaceId: dbUser.workspaceId },
    _max: { position: true },
  });

  const stage = await db.kanbanStage.create({
    data: {
      workspaceId: dbUser.workspaceId,
      name: parsed.data.name,
      color: parsed.data.color ?? '#6366f1',
      position: (maxPos._max.position ?? -1) + 1,
    },
  });

  return NextResponse.json({ stage }, { status: 201 });
}

// ── PATCH /api/kanban  - move contact to stage ─────────────────────────────────
const moveSchema = z.object({
  contactId: z.string().uuid(),
  stageId: z.string().uuid(),
});

export async function PATCH(req: NextRequest) {
  const dbUser = await getUser();
  if (!dbUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = moveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { contactId, stageId } = parsed.data;

  // Verify ownership
  const [contact, stage] = await Promise.all([
    db.contact.findUnique({ where: { id: contactId } }),
    db.kanbanStage.findUnique({ where: { id: stageId } }),
  ]);

  if (!contact || contact.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }
  if (!stage || stage.workspaceId !== dbUser.workspaceId) {
    return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
  }

  const updated = await db.contact.update({
    where: { id: contactId },
    data: { kanbanStageId: stageId },
  });

  // Auto-create activity for stage change
  await db.activity.create({
    data: {
      workspaceId: dbUser.workspaceId,
      contactId,
      type: 'STAGE_CHANGE',
      content: `Moved to ${stage.name}`,
      authorId: dbUser.id,
    },
  });

  return NextResponse.json({ contact: updated });
}
