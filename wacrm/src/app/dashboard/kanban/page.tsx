// src/app/dashboard/kanban/page.tsx
import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import KanbanClient from '@/components/kanban/KanbanClient';
import TasksClient from '@/components/tasks/TasksClient';
import { getWorkspaceTasks, getTaskStats } from '@/lib/tasks';

interface PageProps {
  searchParams: Promise<{ view?: string }>;
}

export default async function KanbanPage({ searchParams }: PageProps) {
  const { dbUser, workspace } = await getAuthenticatedUser();
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
      inv.status === 'DRAFT' || inv.status === 'SENT' || inv.status === 'OVERDUE'
    );
    const paidThisMonth = invoices.filter(inv => 
      inv.status === 'PAID' && inv.paidAt && inv.paidAt >= startOfMonth
    );

    const invoiceStats = {
      totalOutstanding: outstanding.reduce((sum, inv) => sum + inv.amount, 0),
      totalPaidThisMonth: paidThisMonth.reduce((sum, inv) => sum + inv.amount, 0),
      outstandingCount: outstanding.length,
      paidThisMonthCount: paidThisMonth.length,
    };

    return (
      <TasksClient
        initialTasks={tasks}
        initialInvoices={invoices as any}
        stats={stats}
        invoiceStats={invoiceStats}
        currentUser={dbUser}
        workspace={workspace}
      />
    );
  }

  const stages = await db.kanbanStage.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { position: 'asc' },
    select: {
      id: true,
      name: true,
      color: true,
      position: true,
      workspaceId: true,
      contacts: {
        where: { deletedAt: null },
        orderBy: { lastActivityAt: { sort: 'desc', nulls: 'last' } },
        select: {
          id: true,
          name: true,
          phoneNumber: true,
          email: true,
          kanbanStageId: true,
          lastActivityAt: true,
          estimatedValue: true,
          confidenceLevel: true,
          interest: true,
          contactTags: {
            select: {
              tagId: true,
              tag: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      },
    },
  });

  return <KanbanClient stages={stages as any} />;
}
