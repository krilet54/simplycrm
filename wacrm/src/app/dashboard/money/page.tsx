import { getAuthenticatedUser } from '@/lib/auth';
import { db } from '@/lib/db';
import MoneyClient from '@/components/MoneyClient';

export default async function MoneyPage() {
  const { dbUser, workspace } = await getAuthenticatedUser();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Fetch data in parallel with proper limits
  const [invoices, allContacts, unpaidStats, paidThisMonthStats, paidAllTimeStats] = await Promise.all([
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
    db.invoice.findMany({
      where: { 
        workspaceId: workspace.id, 
        status: { notIn: ['PAID', 'CANCELLED'] } 
      },
      include: { items: true },
    }),

    // Paid this month
    db.invoice.findMany({
      where: { 
        workspaceId: workspace.id, 
        status: 'PAID',
        paidAt: { gte: monthStart },
      },
      include: { items: true },
    }),

    // Paid all time
    db.invoice.findMany({
      where: { 
        workspaceId: workspace.id, 
        status: 'PAID',
      },
      include: { items: true },
    }),
  ]);

  // Calculate totals (done after single parallel fetch)
  const calcTotal = (invs: typeof unpaidStats) => invs.reduce((sum, inv) => {
    const itemsTotal = inv.items.reduce((itemSum, item) => itemSum + item.total, 0);
    return sum + (inv.amount || itemsTotal);
  }, 0);

  return (
    <MoneyClient
      invoices={invoices}
      contacts={allContacts}
      summary={{
        totalUnpaid: unpaidStats.length,
        totalUnpaidValue: calcTotal(unpaidStats),
        totalPaidThisMonth: calcTotal(paidThisMonthStats),
        totalPaidAllTime: calcTotal(paidAllTimeStats),
      }}
    />
  );
}
