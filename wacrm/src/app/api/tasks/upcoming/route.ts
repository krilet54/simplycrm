// src/app/api/tasks/upcoming/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const hoursAhead = parseInt(searchParams.get('hoursAhead') ?? '24');

  try {
    const now = new Date();
    const upcomingDate = new Date();
    upcomingDate.setHours(upcomingDate.getHours() + hoursAhead);

    const tasks = await db.task.findMany({
      where: {
        workspaceId: dbUser.workspaceId,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: { gte: now, lte: upcomingDate },
        reminderSent: false,
      },
      include: {
        contact: { select: { id: true, name: true, phoneNumber: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch upcoming tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}
