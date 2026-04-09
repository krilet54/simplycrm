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
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const isDone = searchParams.get('isDone');
  const overdue = searchParams.get('overdue') === 'true';
  const today = searchParams.get('today') === 'true';

  const where: any = { workspaceId: dbUser.workspaceId };

  // Role-based visibility: OWNER and ADMIN see all; AGENT sees only their own
  if (!['OWNER', 'ADMIN'].includes(dbUser.role)) {
    where.createdById = dbUser.id;
  }

  if (isDone === 'true') {
    where.isDone = true;
  } else if (isDone === 'false') {
    where.isDone = false;
  }

  if (overdue) {
    const today_start = new Date();
    today_start.setHours(0, 0, 0, 0);
    where.dueDate = { lt: today_start };
    where.isDone = false;
  }

  if (today) {
    const today_start = new Date();
    today_start.setHours(0, 0, 0, 0);
    const today_end = new Date();
    today_end.setHours(23, 59, 59, 999);
    where.dueDate = { gte: today_start, lte: today_end };
    where.isDone = false;
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
  });

  return NextResponse.json({ followUps });
}
