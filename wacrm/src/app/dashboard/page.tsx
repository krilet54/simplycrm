import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import HomeClient from '@/components/HomeClient';

export default async function DashboardPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  try {
    // Determine if this is an agent (agents see only their own data)
    const isAgent = dbUser.role === 'AGENT';

    // Pre-fetch agent contact IDs ONCE if needed (avoids N+1)
    let agentContactIds: string[] | null = null;
    if (isAgent) {
      const contacts = await db.contact.findMany({
        where: {
          workspaceId: workspace.id,
          OR: [
            { assignedToId: dbUser.id },
            { createdById: dbUser.id },
          ],
        },
        select: { id: true },
      });
      agentContactIds = contacts.map((c) => c.id);
    }

    // Build reusable filters
    const contactFilter: any = { workspaceId: workspace.id, deletedAt: null };
    if (isAgent) {
      contactFilter.OR = [{ assignedToId: dbUser.id }, { createdById: dbUser.id }];
    }

    const taskFilter: any = { workspaceId: workspace.id };
    if (isAgent) {
      taskFilter.OR = [{ assignedToId: dbUser.id }, { createdById: dbUser.id }];
    }

    const invoiceFilter: any = { workspaceId: workspace.id };
    if (isAgent && agentContactIds) {
      invoiceFilter.contactId = { in: agentContactIds };
    }

    const followUpFilter: any = { workspaceId: workspace.id, isDone: false };
    if (isAgent && agentContactIds) {
      followUpFilter.contactId = { in: agentContactIds };
    }

    const activityFilter: any = { workspaceId: workspace.id };
    if (isAgent && agentContactIds) {
      activityFilter.contactId = { in: agentContactIds };
    }

    // Fetch all data in parallel - single query per stat
    const [
      totalContacts,
      newContactsThisMonth,
      unpaidInvoiceStats,
      paidThisMonthStats,
      recentInvoices,
      overdueFollowUps,
      dueTodayFollowUps,
      upcomingFollowUps,
      todoCount,
      inProgressCount,
      dueTodayTasks,
      overdueTasks,
      activities,
      // Onboarding data (only for OWNER)
      totalInvoices,
      teamMemberCount,
      onboardingStatus,
    ] = await Promise.all([
      // Contact stats
      db.contact.count({ where: contactFilter }),
      db.contact.count({ where: { ...contactFilter, createdAt: { gte: monthStart } } }),

      // Invoice stats
      db.invoice.aggregate({
        where: { ...invoiceFilter, status: { in: ['DRAFT', 'SENT', 'OVERDUE'] } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      db.invoice.aggregate({
        where: { ...invoiceFilter, status: 'PAID', paidAt: { gte: monthStart } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      db.invoice.findMany({
        where: invoiceFilter,
        include: { contact: { select: { name: true, phoneNumber: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Follow-up stats
      db.followUp.count({ where: { ...followUpFilter, dueDate: { lt: today } } }),
      db.followUp.count({ where: { ...followUpFilter, dueDate: { gte: today, lt: tomorrow } } }),
      db.followUp.findMany({
        where: { ...followUpFilter, dueDate: { gte: tomorrow } },
        include: { contact: { select: { id: true, name: true, phoneNumber: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),

      // Task stats
      db.task.count({ where: { ...taskFilter, status: 'TODO' } }),
      db.task.count({ where: { ...taskFilter, status: 'IN_PROGRESS' } }),
      db.task.count({ where: { ...taskFilter, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { gte: today, lt: tomorrow } } }),
      db.task.count({ where: { ...taskFilter, status: { in: ['TODO', 'IN_PROGRESS'] }, dueDate: { lt: today } } }),

      // Activities
      db.activity.findMany({
        where: activityFilter,
        include: {
          contact: { select: { id: true, name: true, phoneNumber: true } },
          author: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 8,
      }),

      // Onboarding data (for OWNER only - lightweight queries)
      db.invoice.count({ where: { workspaceId: workspace.id } }),
      db.user.count({ where: { workspaceId: workspace.id } }),
      db.$queryRaw<Array<{ onboardingCompleted: boolean }>>`
        SELECT COALESCE("onboardingCompleted", false) as "onboardingCompleted" 
        FROM "workspaces" 
        WHERE "id" = ${workspace.id}
      `.catch(() => [{ onboardingCompleted: false }]),
    ]);

    // Determine if onboarding should be shown
    // Only show for OWNER who hasn't completed onboarding AND doesn't have all items yet
    const onboardingCompleted = (onboardingStatus as any)?.[0]?.onboardingCompleted ?? false;
    const hasAllOnboardingItems = totalContacts > 0 && totalInvoices > 0 && teamMemberCount > 1;

    // For existing users who already have data, don't show onboarding
    // Show onboarding only if: OWNER + not marked complete + missing at least one item
    const showOnboarding = dbUser.role === 'OWNER' && !onboardingCompleted && !hasAllOnboardingItems;

    return (
      <HomeClient
        data={{
          contacts: { total: totalContacts, newThisMonth: newContactsThisMonth },
          invoices: {
            totalUnpaid: unpaidInvoiceStats._count._all,
            totalUnpaidValue: unpaidInvoiceStats._sum.amount ?? 0,
            paidThisMonth: paidThisMonthStats._sum.amount ?? 0,
            recentInvoices,
          },
          followUps: { overdue: overdueFollowUps, dueToday: dueTodayFollowUps, upcomingFollowUps },
          tasks: {
            todoCount,
            inProgressCount,
            dueTodayCount: dueTodayTasks,
            overdueCount: overdueTasks,
          },
          activities,
          analytics: null,
          user: dbUser,
          workspace,
          // Onboarding data
          onboarding: showOnboarding ? {
            hasContacts: totalContacts > 0,
            hasInvoices: totalInvoices > 0,
            hasTeamMembers: teamMemberCount > 1,
          } : null,
        }}
      />
    );
  } catch (error) {
    console.error('Dashboard data loading failed, serving fallback view:', error);

    return (
      <HomeClient
        data={{
          contacts: { total: 0, newThisMonth: 0 },
          invoices: {
            totalUnpaid: 0,
            totalUnpaidValue: 0,
            paidThisMonth: 0,
            recentInvoices: [],
          },
          followUps: { overdue: 0, dueToday: 0, upcomingFollowUps: [] },
          tasks: {
            todoCount: 0,
            inProgressCount: 0,
            dueTodayCount: 0,
            overdueCount: 0,
          },
          activities: [],
          analytics: null,
          user: dbUser,
          workspace,
          onboarding: null,
        }}
      />
    );
  }
}
