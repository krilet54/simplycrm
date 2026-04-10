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

  try {
    // Optimized query: Load stages first, then contacts with minimal relations
    const stages = await db.kanbanStage.findMany({
      where: { workspaceId: dbUser.workspaceId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        name: true,
        position: true,
        color: true,
        workspaceId: true,
      },
    });

    // Get all contacts for this workspace grouped by stage (single efficient query)
    const contacts = await db.contact.findMany({
      where: {
        workspaceId: dbUser.workspaceId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        phoneNumber: true,
        email: true,
        avatarUrl: true,
        kanbanStageId: true,
        lastActivityAt: true,
        source: true,
        estimatedValue: true,
        confidenceLevel: true,
        assignedToId: true,
        // Only fetch tag IDs and count, not full tag objects
      },
      orderBy: { lastActivityAt: { sort: 'desc', nulls: 'last' } },
    });

    // Get tag relationships efficiently
    const contactTagMap = await db.contactTag.findMany({
      where: { contactId: { in: contacts.map(c => c.id) } },
      select: {
        contactId: true,
        tag: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Build tag map for quick lookup
    const tagsByContactId = new Map<string, any[]>();
    contactTagMap.forEach(ct => {
      if (!tagsByContactId.has(ct.contactId)) {
        tagsByContactId.set(ct.contactId, []);
      }
      tagsByContactId.get(ct.contactId)!.push(ct.tag);
    });

    // Get activity counts for contacts
    const activityCounts = await db.activity.groupBy({
      by: ['contactId'],
      where: { contactId: { in: contacts.map(c => c.id) } },
      _count: { id: true },
    });

    const activityCountMap = new Map(
      activityCounts.map(ac => [ac.contactId, ac._count.id])
    );

    // Enrich contacts with tags and activity counts
    const enrichedContacts = contacts.map(contact => ({
      ...contact,
      contactTags: (tagsByContactId.get(contact.id) || []).map(tag => ({ tag })),
      _count: { activities: activityCountMap.get(contact.id) || 0 },
    }));

    // Group contacts by stage
    const stagesWithContacts = stages.map(stage => ({
      ...stage,
      contacts: enrichedContacts
        .filter(c => c.kanbanStageId === stage.id)
        .sort((a, b) => {
          // Sort by lastActivityAt DESC, with nulls last
          if (!a.lastActivityAt && !b.lastActivityAt) return 0;
          if (!a.lastActivityAt) return 1;
          if (!b.lastActivityAt) return -1;
          return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        }),
    }));

    // Add cache headers for better performance
    const response = NextResponse.json({ stages: stagesWithContacts });
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  } catch (error) {
    console.error('Failed to fetch kanban board:', error);
    return NextResponse.json({ error: 'Failed to fetch kanban board' }, { status: 500 });
  }
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
