'use client';

import { format } from 'date-fns';
import {
  MessageSquare,
  FileText,
  CheckCircle2,
  TrendingUp,
  Clock,
  ChevronRight,
  Users,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  newActivitiesCount: number;
  unpaidInvoicesCount: number;
  tasksoDueToday: number;
  pipelineTotal: number;
  activeDeals: number;
  avgDeal: number;
  newContactsMonth: number;
  completedTasksMonth: number;
  upcomingTasks: any[];
  currentUser: any;
  workspace: any;
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const showPipeline = data.pipelineTotal > 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'var(--font-display)' }}>
            {getGreeting()}, {data.currentUser.name} 👋
          </h1>
          <p className="text-gray-500 mt-1">Welcome back to {data.workspace.businessName}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key Metrics - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">Today</span>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{data.newActivitiesCount}</div>
                <p className="text-sm text-gray-500 mt-1">Activities today</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">Today</span>
                  <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{data.tasksoDueToday}</div>
                <p className="text-sm text-gray-500 mt-1">Follow-ups due</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">Pending</span>
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-red-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{data.unpaidInvoicesCount}</div>
                <p className="text-sm text-gray-500 mt-1">Unpaid invoices</p>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-500">This month</span>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{data.completedTasksMonth}</div>
                <p className="text-sm text-gray-500 mt-1">Tasks completed</p>
              </div>
            </div>

            {/* Pipeline Section */}
            {showPipeline && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Pipeline Overview
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-lg p-4 border border-emerald-100">
                    <p className="text-emerald-700 text-sm font-medium">Total in Pipeline</p>
                    <p className="text-2xl font-bold text-emerald-900 pt-2" suppressHydrationWarning>
                      ₹{data.pipelineTotal.toLocaleString('en-US')}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-lg p-4 border border-blue-100">
                    <p className="text-blue-700 text-sm font-medium">Active Deals</p>
                    <p className="text-2xl font-bold text-blue-900 pt-2">{data.activeDeals}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-lg p-4 border border-purple-100">
                    <p className="text-purple-700 text-sm font-medium">Average Deal</p>
                    <p className="text-2xl font-bold text-purple-900 pt-2" suppressHydrationWarning>
                      ₹{data.avgDeal.toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Follow-ups */}
            {data.upcomingTasks.length > 0 && (
              <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Upcoming Follow-ups
                </h2>
                <div className="space-y-3">
                  {data.upcomingTasks.map((task) => (
                    <Link
                      key={task.id}
                      href={`/dashboard/inbox?contactId=${task.contactId}`}
                      className="flex items-start justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition group border border-transparent hover:border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 group-hover:text-forest-600 transition">
                          {task.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {task.contact.name || task.contact.phoneNumber}
                        </p>
                        <p className="text-xs text-gray-400 pt-1" suppressHydrationWarning>
                          Due: {format(new Date(task.dueDate), 'MMM d, h:mm a')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            task.priority === 'HIGH'
                              ? 'bg-red-100 text-red-700'
                              : task.priority === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {task.priority}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" />
                      </div>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/dashboard/tasks"
                  className="text-sm text-forest-600 hover:text-forest-700 font-medium mt-4 inline-flex items-center gap-1"
                >
                  View all tasks <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}


          </div>

          {/* Sidebar - This Month Stats */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">This Month</h2>
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">New Contacts</p>
                    <p className="text-2xl font-bold text-gray-900">{data.newContactsMonth}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pipeline Total</p>
                    <p className="text-2xl font-bold text-gray-900" suppressHydrationWarning>
                      ₹{data.pipelineTotal.toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Tasks Done</p>
                    <p className="text-2xl font-bold text-gray-900">{data.completedTasksMonth}</p>
                  </div>
                </div>

                <hr className="border-gray-200 my-5" />
                
                <div className="space-y-3">
                  <Link
                    href="/dashboard/inbox"
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white px-4 py-3 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Open Inbox
                  </Link>
                  <Link
                    href="/dashboard/contacts"
                    className="w-full bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 border border-gray-300"
                  >
                    <Users className="w-4 h-4" />
                    View Contacts
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
