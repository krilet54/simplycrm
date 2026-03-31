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

  // Get tasks due in next N hours (for reminders)
  const now = new Date();
  const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const upcomingTasks = await db.task.findMany({
    where: {
      workspaceId: dbUser.workspaceId,
      status: { in: ['TODO', 'IN_PROGRESS', 'SNOOZED'] },
      dueDate: {
        gte: now,
        lte: futureTime,
      },
      reminderSent: false, // Only tasks we haven't reminded about yet
    },
    include: {
      contact: { select: { id: true, name: true, phoneNumber: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  return NextResponse.json({ tasks: upcomingTasks });
}
