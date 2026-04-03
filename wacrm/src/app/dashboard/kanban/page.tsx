// src/app/dashboard/kanban/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import KanbanClient from '@/components/kanban/KanbanClient';
import TasksClient from '@/components/tasks/TasksClient';
import { getWorkspaceTasks, getTaskStats } from '@/lib/tasks';

// Disable caching to always fetch fresh data
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function KanbanPage({ searchParams }: PageProps) {
  const { workspace, user } = await getAuthenticatedUser();
  const params = await searchParams;
  const isTasksView = params.view === 'tasks';

  if (isTasksView) {
    // Fetch tasks and invoices for the tasks view
    const [tasks, stats, invoices] = await Promise.all([
      getWorkspaceTasks(workspace.id),
      getTaskStats(workspace.id),
      db.invoice.findMany({
        where: { workspaceId: workspace.id },
        include: {
          contact: {
            select: { id: true, name: true, phoneNumber: true, email: true },
          },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Calculate invoice stats
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const outstanding = invoices.filter(inv => 
      inv.status === 'SENT' || inv.status === 'OVERDUE'
    );
    const paidThisMonth = invoices.filter(inv => 
      inv.status === 'PAID' && inv.paidAt && inv.paidAt >= startOfMonth
    );

    const invoiceStats = {
      totalOutstanding: outstanding.reduce((sum, inv) => sum + inv.total, 0),
      totalPaidThisMonth: paidThisMonth.reduce((sum, inv) => sum + inv.total, 0),
      outstandingCount: outstanding.length,
      paidThisMonthCount: paidThisMonth.length,
    };

    return (
      <TasksClient
        initialTasks={tasks}
        initialInvoices={invoices as any}
        stats={stats}
        invoiceStats={invoiceStats}
        currentUser={user}
        workspace={workspace}
      />
    );
  }

  const stages = await db.kanbanStage.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { position: 'asc' },
    include: {
      contacts: {
        orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
        include: {
          contactTags: { include: { tag: true } },
          _count: { select: { messages: true } },
          messages: {
            take: 1,
            orderBy: { timestamp: 'desc' },
            select: { content: true, timestamp: true },
          },
        },
      },
    },
  });

  return <KanbanClient stages={stages as any} />;
}
