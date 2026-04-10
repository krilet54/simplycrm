import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import MoneyClient from '@/components/MoneyClient';

export default async function MoneyPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Fetch data in parallel with proper limits
  const [invoices, allContacts, unpaidSummary, paidThisMonthSummary, paidAllTimeSummary] = await Promise.all([
    // Paginated invoice list (first 100 for display)
    db.invoice.findMany({
      where: { workspaceId: workspace.id },
      include: {
        contact: { select: { id: true, name: true, phoneNumber: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    
    // Contacts for dropdown (minimal fields)
    db.contact.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      select: { id: true, name: true, phoneNumber: true },
      orderBy: { name: 'asc' },
    }),

    // Unpaid count and value (DB aggregation)
    db.invoice.aggregate({
      where: { 
        workspaceId: workspace.id, 
        status: { notIn: ['PAID', 'CANCELLED'] } 
      },
      _sum: { amount: true },
      _count: { _all: true },
    }),

    // Paid this month
    db.invoice.aggregate({
      where: { 
        workspaceId: workspace.id, 
        status: 'PAID',
        paidAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),

    // Paid all time
    db.invoice.aggregate({
      where: { 
        workspaceId: workspace.id, 
        status: 'PAID',
      },
      _sum: { amount: true },
    }),
  ]);

  return (
    <MoneyClient
      invoices={invoices}
      contacts={allContacts}
      summary={{
        totalUnpaid: unpaidSummary._count._all,
        totalUnpaidValue: unpaidSummary._sum.amount ?? 0,
        totalPaidThisMonth: paidThisMonthSummary._sum.amount ?? 0,
        totalPaidAllTime: paidAllTimeSummary._sum.amount ?? 0,
      }}
    />
  );
}
