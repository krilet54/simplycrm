import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import HomeClient from '@/components/HomeClient';
import { Prisma } from '@prisma/client';

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

    const contactAccessFilter = isAgent
      ? {
          OR: [{ assignedToId: dbUser.id }, { createdById: dbUser.id }],
        }
      : {};

    // Build reusable filters
    const contactFilter: any = {
      workspaceId: workspace.id,
      deletedAt: null,
      ...contactAccessFilter,
    };

    const taskFilter: any = { workspaceId: workspace.id };
    if (isAgent) {
      taskFilter.OR = [{ assignedToId: dbUser.id }, { createdById: dbUser.id }];
    }

    const invoiceFilter: any = {
      workspaceId: workspace.id,
      ...(isAgent
        ? {
            contact: {
              OR: [{ assignedToId: dbUser.id }, { createdById: dbUser.id }],
            },
          }
        : {}),
    };

    const followUpFilter: any = {
      workspaceId: workspace.id,
      isDone: false,
      ...(isAgent
        ? {
            contact: {
              OR: [{ assignedToId: dbUser.id }, { createdById: dbUser.id }],
            },
          }
        : {}),
    };

    const activityFilter: any = {
      workspaceId: workspace.id,
      ...(isAgent
        ? {
            contact: {
              OR: [{ assignedToId: dbUser.id }, { createdById: dbUser.id }],
            },
          }
        : {}),
    };

    const contactScopeSql = isAgent
      ? Prisma.sql`AND ("assignedToId" = ${dbUser.id} OR "createdById" = ${dbUser.id})`
      : Prisma.empty;
    const followUpScopeSql = isAgent
      ? Prisma.sql`AND EXISTS (
          SELECT 1
          FROM "contacts" c
          WHERE c."id" = f."contactId"
            AND (c."assignedToId" = ${dbUser.id} OR c."createdById" = ${dbUser.id})
        )`
      : Prisma.empty;
    const taskScopeSql = isAgent
      ? Prisma.sql`AND ("assignedToId" = ${dbUser.id} OR "createdById" = ${dbUser.id})`
      : Prisma.empty;

    // Fetch all data in parallel - single query per stat
    const [
      contactStatsRows,
      unpaidInvoiceStats,
      paidThisMonthStats,
      recentInvoices,
      followUpStatsRows,
      upcomingFollowUps,
      taskStatsRows,
      activities,
    ] = await Promise.all([
      db.$queryRaw<Array<{ total: number; new_this_month: number }>>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE "deletedAt" IS NULL)::int AS total,
          COUNT(*) FILTER (WHERE "deletedAt" IS NULL AND "createdAt" >= ${monthStart})::int AS new_this_month
        FROM "contacts"
        WHERE "workspaceId" = ${workspace.id}
        ${contactScopeSql}
      `),

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
        take: 3,
      }),

      db.$queryRaw<Array<{ overdue: number; due_today: number }>>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE f."dueDate" < ${today})::int AS overdue,
          COUNT(*) FILTER (WHERE f."dueDate" >= ${today} AND f."dueDate" < ${tomorrow})::int AS due_today
        FROM "follow_ups" f
        WHERE f."workspaceId" = ${workspace.id}
          AND f."isDone" = false
          ${followUpScopeSql}
      `),
      db.followUp.findMany({
        where: { ...followUpFilter, dueDate: { gte: tomorrow } },
        include: { contact: { select: { id: true, name: true, phoneNumber: true } } },
        orderBy: { dueDate: 'asc' },
        take: 3,
      }),

      db.$queryRaw<Array<{ todo_count: number; in_progress_count: number; due_today_count: number; overdue_count: number }>>(Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE "status" = 'TODO')::int AS todo_count,
          COUNT(*) FILTER (WHERE "status" = 'IN_PROGRESS')::int AS in_progress_count,
          COUNT(*) FILTER (
            WHERE "status" IN ('TODO', 'IN_PROGRESS')
              AND "dueDate" >= ${today}
              AND "dueDate" < ${tomorrow}
          )::int AS due_today_count,
          COUNT(*) FILTER (
            WHERE "status" IN ('TODO', 'IN_PROGRESS')
              AND "dueDate" < ${today}
          )::int AS overdue_count
        FROM "tasks"
        WHERE "workspaceId" = ${workspace.id}
          ${taskScopeSql}
      `),

      // Activities
      db.activity.findMany({
        where: activityFilter,
        include: {
          contact: { select: { id: true, name: true, phoneNumber: true } },
          author: { select: { id: true, name: true } },
        },
        orderBy: { timestamp: 'desc' },
        take: 5,
      }),
    ]);

    const contactStats = contactStatsRows[0] ?? { total: 0, new_this_month: 0 };
    const followUpStats = followUpStatsRows[0] ?? { overdue: 0, due_today: 0 };
    const taskStats = taskStatsRows[0] ?? {
      todo_count: 0,
      in_progress_count: 0,
      due_today_count: 0,
      overdue_count: 0,
    };

    const [totalInvoices, teamMemberCount] =
      dbUser.role === 'OWNER'
        ? await Promise.all([
            db.invoice.count({ where: { workspaceId: workspace.id } }),
            db.user.count({ where: { workspaceId: workspace.id } }),
          ])
        : [0, 0];

    // Determine if onboarding should be shown
    // Only show for OWNER who hasn't completed onboarding AND doesn't have all items yet
    const onboardingCompleted = workspace.onboardingCompleted ?? false;
    const hasAllOnboardingItems = contactStats.total > 0 && totalInvoices > 0 && teamMemberCount > 1;

    // For existing users who already have data, don't show onboarding
    // Show onboarding only if: OWNER + not marked complete + missing at least one item
    const showOnboarding = dbUser.role === 'OWNER' && !onboardingCompleted && !hasAllOnboardingItems;

    return (
      <HomeClient
        data={{
          contacts: { total: contactStats.total, newThisMonth: contactStats.new_this_month },
          invoices: {
            totalUnpaid: unpaidInvoiceStats._count._all,
            totalUnpaidValue: unpaidInvoiceStats._sum.amount ?? 0,
            paidThisMonth: paidThisMonthStats._sum.amount ?? 0,
            recentInvoices,
          },
          followUps: { overdue: followUpStats.overdue, dueToday: followUpStats.due_today, upcomingFollowUps },
          tasks: {
            todoCount: taskStats.todo_count,
            inProgressCount: taskStats.in_progress_count,
            dueTodayCount: taskStats.due_today_count,
            overdueCount: taskStats.overdue_count,
          },
          activities,
          analytics: null,
          user: dbUser,
          workspace,
          // Onboarding data
          onboarding: showOnboarding ? {
            hasContacts: contactStats.total > 0,
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
