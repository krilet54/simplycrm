// src/app/api/followups/count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const today_start = new Date();
  today_start.setHours(0, 0, 0, 0);
  const today_end = new Date();
  today_end.setHours(23, 59, 59, 999);

  // Overdue follow-ups
  const overdueFollowUps = await db.followUp.count({
    where: {
      workspaceId: dbUser.workspaceId,
      dueDate: { lt: today_start },
      isDone: false,
    },
  });

  // Due today follow-ups
  const todayFollowUps = await db.followUp.count({
    where: {
      workspaceId: dbUser.workspaceId,
      dueDate: { gte: today_start, lte: today_end },
      isDone: false,
    },
  });

  // Overdue tasks
  const overdueTasks = await db.task.count({
    where: {
      workspaceId: dbUser.workspaceId,
      dueDate: { lt: today_start },
      status: { in: ['TODO', 'IN_PROGRESS'] },
    },
  });

  // Due today tasks
  const todayTasks = await db.task.count({
    where: {
      workspaceId: dbUser.workspaceId,
      dueDate: { gte: today_start, lte: today_end },
      status: { in: ['TODO', 'IN_PROGRESS'] },
    },
  });

  const overdueCount = overdueFollowUps + overdueTasks;
  const todayCount = todayFollowUps + todayTasks;
  const total = overdueCount + todayCount;

  return NextResponse.json({
    overdueCount,
    todayCount,
    total,
  });
}
