import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  // Fetch key metrics
  const [newMessagesCount, unpaidInvoicesCount, tasksToday, completedTasksMonth] = await Promise.all([
    db.message.count({
      where: {
        workspaceId: workspace.id,
        timestamp: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    db.invoice.count({
      where: {
        workspaceId: workspace.id,
        status: { in: ['SENT', 'OVERDUE'] },
      },
    }),
    db.task.count({
      where: {
        workspaceId: workspace.id,
        status: { in: ['TODO', 'IN_PROGRESS'] },
        dueDate: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    db.task.count({
      where: {
        workspaceId: workspace.id,
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  // Pipeline stats
  const contacts = await db.contact.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    select: { estimatedValue: true },
  });

  const pipelineTotal = contacts.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
  const activeDeals = contacts.filter((c) => c.estimatedValue).length;
  const avgDeal = activeDeals > 0 ? Math.round(pipelineTotal / activeDeals / 100) * 100 : 0;

  // New contacts this month
  const newContactsMonth = await db.contact.count({
    where: {
      workspaceId: workspace.id,
      deletedAt: null,
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });

  // Upcoming tasks (next 7 days)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);

  const upcomingTasks = await db.task.findMany({
    where: {
      workspaceId: workspace.id,
      status: { in: ['TODO', 'IN_PROGRESS'] },
      dueDate: {
        gte: new Date(),
        lte: tomorrow,
      },
    },
    include: {
      contact: { select: { id: true, name: true, phoneNumber: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  // Recent activities
  const recentActivities = await db.activity.findMany({
    where: { workspaceId: workspace.id },
    include: {
      actor: { select: { id: true, name: true } },
      contact: { select: { id: true, name: true, phoneNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return (
    <DashboardClient
      data={{
        newMessagesCount,
        unpaidInvoicesCount,
        tasksoDueToday: tasksToday,
        completedTasksMonth,
        pipelineTotal,
        activeDeals,
        avgDeal,
        newContactsMonth,
        upcomingTasks: upcomingTasks as any,
        recentActivities: recentActivities as any,
        currentUser: dbUser,
        workspace,
      }}
    />
  );
}
