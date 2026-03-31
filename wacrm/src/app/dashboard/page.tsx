// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';
import { getRecentActivities } from '@/lib/activity';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const dbUser = await db.user.findUnique({
    where: { supabaseId: user.id },
    include: { workspace: true },
  });

  if (!dbUser) redirect('/login');

  // Fetch dashboard metrics
  const workspaceId = dbUser.workspaceId;

  // Count new messages today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const newMessagesCount = await db.message.count({
    where: {
      workspaceId,
      senderType: 'CUSTOMER',
      timestamp: { gte: today },
    },
  });

  // Count unpaid invoices
  const unpaidInvoicesCount = await db.invoice.count({
    where: {
      workspaceId,
      status: { in: ['SENT', 'OVERDUE'] },
    },
  });

  // Count tasks due today
  const tasksoDueToday = await db.task.count({
    where: {
      workspaceId,
      status: { in: ['TODO', 'IN_PROGRESS'] },
      dueDate: { gte: today, lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
    },
  });

  // Calculate pipeline total (sum of estimatedValue for non-Closed Lost contacts)
  const closedLostStage = await db.kanbanStage.findFirst({
    where: { workspaceId, name: { contains: 'Closed', mode: 'insensitive' } },
  });

  const pipelineContacts = await db.contact.findMany({
    where: {
      workspaceId,
      estimatedValue: { not: null },
      kanbanStageId: closedLostStage?.id ? { not: closedLostStage.id } : undefined,
    },
    select: { estimatedValue: true },
  });

  const pipelineTotal = pipelineContacts.reduce((sum, c) => sum + (c.estimatedValue || 0), 0);
  const activeDeals = pipelineContacts.length;
  const avgDeal = activeDeals > 0 ? Math.round(pipelineTotal / activeDeals / 100) * 100 : 0;

  // Count new contacts this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const newContactsMonth = await db.contact.count({
    where: {
      workspaceId,
      createdAt: { gte: monthStart },
    },
  });

  // Count completed tasks this month
  const completedTasksMonth = await db.task.count({
    where: {
      workspaceId,
      status: 'COMPLETED',
      completedAt: { gte: monthStart },
    },
  });

  // Get tasks due in next 7 days
  const daysFromNow = new Date();
  daysFromNow.setDate(daysFromNow.getDate() + 7);

  const upcomingTasks = await db.task.findMany({
    where: {
      workspaceId,
      status: { in: ['TODO', 'IN_PROGRESS', 'SNOOZED'] },
      dueDate: { lte: daysFromNow },
    },
    include: {
      contact: { select: { id: true, name: true, phoneNumber: true } },
      creator: { select: { id: true, name: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 10,
  });

  // Get recent activities
  const recentActivities = await getRecentActivities(workspaceId, 10);

  const dashboardData = {
    newMessagesCount,
    unpaidInvoicesCount,
    tasksoDueToday,
    pipelineTotal,
    activeDeals,
    avgDeal,
    newContactsMonth,
    completedTasksMonth,
    upcomingTasks,
    recentActivities,
    currentUser: dbUser,
    workspace: dbUser.workspace,
  };

  return <DashboardClient data={dashboardData} />;
}
