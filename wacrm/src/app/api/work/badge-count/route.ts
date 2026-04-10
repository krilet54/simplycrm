// src/app/api/work/badge-count/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const CACHE_DURATION = 30; // Cache for 30 seconds to reduce DB load

export async function GET(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const isOwnerOrAdmin = dbUser.role === 'OWNER' || dbUser.role === 'ADMIN';

    // Execute all counts in parallel without blocking
    const [overdueFollowUps, todayFollowUps, overdueTasks, todayTasks] = await Promise.all([
      db.followUp.count({
        where: {
          workspaceId: dbUser.workspaceId,
          isDone: false,
          dueDate: { lt: todayStart },
          ...(isOwnerOrAdmin ? {} : { createdById: dbUser.id }),
        },
      }),
      db.followUp.count({
        where: {
          workspaceId: dbUser.workspaceId,
          isDone: false,
          dueDate: { gte: todayStart, lte: todayEnd },
          ...(isOwnerOrAdmin ? {} : { createdById: dbUser.id }),
        },
      }),
      db.task.count({
        where: {
          workspaceId: dbUser.workspaceId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: { lt: todayStart },
          ...(isOwnerOrAdmin
            ? {}
            : {
                OR: [{ assignedToId: dbUser.id }, { createdById: dbUser.id }],
              }),
        },
      }),
      db.task.count({
        where: {
          workspaceId: dbUser.workspaceId,
          status: { in: ['TODO', 'IN_PROGRESS'] },
          dueDate: { gte: todayStart, lte: todayEnd },
          ...(isOwnerOrAdmin
            ? {}
            : {
                OR: [{ assignedToId: dbUser.id }, { createdById: dbUser.id }],
              }),
        },
      }),
    ]);

    const overdueCount = overdueFollowUps + overdueTasks;
    const todayCount = todayFollowUps + todayTasks;
    const total = overdueCount + todayCount;

    // Cache the response for 30 seconds to reduce database pressure
    const response = NextResponse.json({
      overdueCount,
      todayCount,
      total,
    });
    response.headers.set('Cache-Control', `public, s-maxage=${CACHE_DURATION}, stale-while-revalidate=60`);
    return response;
  } catch (error: any) {
    console.error('Failed to fetch badge count:', error?.message);
    return NextResponse.json(
      { error: 'Failed to fetch badge count', total: 0 },
      { status: 500 }
    );
  }
}
