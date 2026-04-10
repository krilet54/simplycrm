import { db } from '@/lib/db';
import type { TaskStatus } from '@prisma/client';

const ACTIVE_TASK_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS'];

type BadgeUser = {
  id: string;
  workspaceId: string;
  role: string;
};

export async function getWorkBadgeCount(dbUser: BadgeUser) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const isOwnerOrAdmin = dbUser.role === 'OWNER' || dbUser.role === 'ADMIN';

  const followUpWhere = {
    workspaceId: dbUser.workspaceId,
    isDone: false,
    ...(isOwnerOrAdmin ? {} : { createdById: dbUser.id }),
  };

  const taskWhere = {
    workspaceId: dbUser.workspaceId,
    status: { in: ACTIVE_TASK_STATUSES },
    ...(isOwnerOrAdmin
      ? {}
      : {
          OR: [{ assignedToId: dbUser.id }, { createdById: dbUser.id }],
        }),
  };

  const [overdueFollowUps, todayFollowUps, overdueTasks, todayTasks] = await Promise.all([
    db.followUp.count({
      where: {
        ...followUpWhere,
        dueDate: { lt: todayStart },
      },
    }),
    db.followUp.count({
      where: {
        ...followUpWhere,
        dueDate: { gte: todayStart, lte: todayEnd },
      },
    }),
    db.task.count({
      where: {
        ...taskWhere,
        dueDate: { lt: todayStart },
      },
    }),
    db.task.count({
      where: {
        ...taskWhere,
        dueDate: { gte: todayStart, lte: todayEnd },
      },
    }),
  ]);

  const overdueCount = overdueFollowUps + overdueTasks;
  const todayCount = todayFollowUps + todayTasks;

  return {
    overdueCount,
    todayCount,
    total: overdueCount + todayCount,
  };
}
