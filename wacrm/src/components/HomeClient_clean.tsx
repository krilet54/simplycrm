'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

interface HomeClientProps {
  data: {
    contacts: { total: number; newThisMonth: number };
    invoices: {
      totalUnpaid: number;
      totalUnpaidValue: number;
      paidThisMonth: number;
      recentInvoices: any[];
    };
    followUps: {
      overdue: number;
      dueToday: number;
      upcomingFollowUps: any[];
    };
    tasks: {
      todoCount: number;
      inProgressCount: number;
      dueTodayCount: number;
      overdueCount: number;
    };
    activities: any[];
    analytics: any;
    user: { id: string; name: string; role?: string };
    workspace: { businessName: string };
  };
}

export default function HomeClient({ data }: HomeClientProps) {
  const router = useRouter();
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  const upNextItems = [
    ...data.followUps.upcomingFollowUps.map((fu: any) => ({
      type: 'followup',
      id: fu.id,
      title: fu.contact?.name || 'Unknown',
      dueDate: fu.dueDate,
      isDone: false,
    })),
    ...data.tasks.dueTodayCount > 0
      ? [
          {
            type: 'task',
            id: 'tasks',
            title: `${data.tasks.dueTodayCount} task${data.tasks.dueTodayCount > 1 ? 's' : ''} due today`,
            dueDate: new Date(),
            isDone: false,
          },
        ]
      : [],
  ]
    .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getDaysDiff = (date: Date) => {
    const diff = new Date(date).getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)} days ago`;
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-4xl font-bold text-gray-900 mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {greeting}, {data.user.name.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-600">
            {data.workspace.businessName} • {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <>
          {/* Metrics Cards - 4 column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Contacts */}
            <Link
              href="/dashboard/contacts"
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Contacts</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{data.contacts.total}</p>
                  {data.contacts.newThisMonth > 0 && (
                    <p className="text-sm text-green-600 mt-2">+{data.contacts.newThisMonth} new this month</p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
              </div>
            </Link>

            {/* Outstanding Invoices */}
            <Link
              href="/dashboard/money"
              className={`rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border ${
                data.invoices.totalUnpaid > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Outstanding</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(data.invoices.totalUnpaidValue)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    across {data.invoices.totalUnpaid} invoice{data.invoices.totalUnpaid !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 11h.01"/><path d="M8 15a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                  </svg>
                </div>
              </div>
            </Link>

            {/* Collected This Month */}
            <Link
              href="/dashboard/money"
              className="bg-green-50 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-green-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Collected</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {formatCurrency(data.invoices.paidThisMonth)}
                  </p>
                  <p className="text-sm text-green-600 mt-2">paid invoices this month</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 17"/>
                    <polyline points="17 6 23 6 23 12"/>
                  </svg>
                </div>
              </div>
            </Link>

            {/* Follow-ups Due */}
            <Link
              href="/dashboard/followups"
              className={`rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer border ${
                data.followUps.overdue > 0
                  ? 'bg-red-50 border-red-200'
                  : data.followUps.dueToday > 0
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Due Attention</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {data.followUps.overdue + data.followUps.dueToday}
                  </p>
                  <div className="text-sm mt-2 space-y-0.5">
                    {data.followUps.overdue > 0 && (
                      <p className="text-red-600">{data.followUps.overdue} overdue</p>
                    )}
                    {data.followUps.dueToday > 0 && (
                      <p className="text-amber-600">{data.followUps.dueToday} today</p>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                  </svg>
                </div>
              </div>
            </Link>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left - Recent Activity (60%) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
                
                {data.activities.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No activity yet</p>
                    <p className="text-gray-500 text-sm mt-1">Add your first customer to get started</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-medium">{activity.contact?.name || 'Unknown'}</span>
                            {' — '}
                            <span className="text-gray-600 truncate">
                              {activity.content}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <Link href="/dashboard/contacts" className="text-sm font-medium text-blue-600 hover:text-blue-700 mt-4 block">
                  View all →
                </Link>
              </div>
            </div>

            {/* Right - Up Next (40%) */}
            <div>
              <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Up Next</h2>
                
                {upNextItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="text-gray-600 font-medium">You're all caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upNextItems.map((item: any) => {
                      const dayLabel = getDaysDiff(item.dueDate);
                      const isOverdue = new Date(item.dueDate) < now;
                      
                      return (
                        <div key={item.id} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                isOverdue
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {dayLabel}
                              </span>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                {item.type === 'followup' ? 'Follow-up' : 'Task'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <Link href="/dashboard/followups" className="text-sm font-medium text-blue-600 hover:text-blue-700 mt-4 block">
                  View all →
                </Link>
              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  );
}
