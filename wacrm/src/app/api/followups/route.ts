// src/app/api/followups/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

// ── POST /api/followups ────────────────────────────────────────────────────
const createFollowUpSchema = z.object({
  contactId: z.string().uuid(),
  note: z.string().max(500).optional(),
  dueDate: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const parsed = createFollowUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { contactId, note, dueDate } = parsed.data;

  // Verify contact belongs to workspace
  const contact = await db.contact.findFirst({
    where: { id: contactId, workspaceId: dbUser.workspaceId },
  });
  if (!contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  }

  try {
    const followUp = await db.followUp.create({
      data: {
        workspaceId: dbUser.workspaceId,
        contactId,
        createdById: dbUser.id,
        note: note || null,
        dueDate: new Date(dueDate),
      },
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            kanbanStage: { select: { name: true, color: true } },
          },
        },
      },
    });

    return NextResponse.json({ followUp }, { status: 201 });
  } catch (error) {
    console.error('FollowUp creation failed:', error);
    return NextResponse.json({ error: 'Failed to create follow-up' }, { status: 500 });
  }
}

// ── GET /api/followups ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const isDone = searchParams.get('isDone');
    const overdue = searchParams.get('overdue') === 'true';
    const today = searchParams.get('today') === 'true';
    const countOnly = searchParams.get('countOnly') === 'true';
    const withStats = searchParams.get('withStats') === 'true';
    const limitParam = Number(searchParams.get('limit') ?? 100);
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 300) : 100;

    const visibilityWhere: any = { workspaceId: dbUser.workspaceId };
    if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
      visibilityWhere.createdById = dbUser.id;
    }

    const where: any = { ...visibilityWhere };

    if (isDone === 'true') {
      where.isDone = true;
    } else if (isDone === 'false') {
      where.isDone = false;
    }

    if (overdue) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      where.dueDate = { lt: todayStart };
      where.isDone = false;
    }

    if (today) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      where.dueDate = { gte: todayStart, lte: todayEnd };
      where.isDone = false;
    }

    if (countOnly) {
      const count = await db.followUp.count({ where });
      return NextResponse.json({ count });
    }

    const followUps = await db.followUp.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            kanbanStage: { select: { name: true, color: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
    });

    if (!withStats) {
      return NextResponse.json({ followUps });
    }

    const now = new Date();
    const [pending, completed, overdueCount] = await Promise.all([
      db.followUp.count({ where: { ...visibilityWhere, isDone: false, dueDate: { gte: now } } }),
      db.followUp.count({ where: { ...visibilityWhere, isDone: true } }),
      db.followUp.count({ where: { ...visibilityWhere, isDone: false, dueDate: { lt: now } } }),
    ]);

    return NextResponse.json({
      followUps,
      stats: {
        pending,
        completed,
        overdue: overdueCount,
      },
    });
  } catch (error: any) {
    console.error('❌ GET /api/followups error:', error?.message || error);
    return NextResponse.json({ error: 'Failed to fetch follow-ups', details: error?.message }, { status: 500 });
  }
}
