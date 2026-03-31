'use client';

import { format } from 'date-fns';
import {
  MessageSquare,
  FileText,
  CheckCircle2,
  TrendingUp,
  Activity,
  Clock,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  newMessagesCount: number;
  unpaidInvoicesCount: number;
  tasksoDueToday: number;
  pipelineTotal: number;
  activeDeals: number;
  avgDeal: number;
  newContactsMonth: number;
  completedTasksMonth: number;
  upcomingTasks: any[];
  recentActivities: any[];
  currentUser: any;
  workspace: any;
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const showPipeline = data.pipelineTotal > 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold mb-1">
            Good morning, {data.currentUser.name} 👋
          </h1>
          <p className="text-gray-400">Welcome back to {data.workspace.businessName}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Metrics - 2x2 Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Today</p>
                <div className="text-2xl font-bold">{data.newMessagesCount}</div>
                <p className="text-xs text-gray-500 mt-1">New messages</p>
              </div>
              <MessageSquare className="w-6 h-6 text-blue-400" />
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Today</p>
                <div className="text-2xl font-bold">{data.tasksoDueToday}</div>
                <p className="text-xs text-gray-500 mt-1">Follow-ups due</p>
              </div>
              <Clock className="w-6 h-6 text-amber-400" />
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Pending</p>
                <div className="text-2xl font-bold">{data.unpaidInvoicesCount}</div>
                <p className="text-xs text-gray-500 mt-1">Unpaid invoices</p>
              </div>
              <FileText className="w-6 h-6 text-red-400" />
            </div>

            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">This month</p>
                <div className="text-2xl font-bold">{data.completedTasksMonth}</div>
                <p className="text-xs text-gray-500 mt-1">Tasks completed</p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-green-400" />
            </div>
          </div>

          {/* Pipeline Section */}
          {showPipeline && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Pipeline Overview
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-700 rounded p-4">
                  <p className="text-gray-400 text-sm">Total in Pipeline</p>
                  <p className="text-3xl font-bold pt-2">
                    ₦{data.pipelineTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-gray-700 rounded p-4">
                  <p className="text-gray-400 text-sm">Active Deals</p>
                  <p className="text-3xl font-bold pt-2">{data.activeDeals}</p>
                </div>
                <div className="bg-gray-700 rounded p-4">
                  <p className="text-gray-400 text-sm">Average Deal</p>
                  <p className="text-3xl font-bold pt-2">
                    ₦{data.avgDeal.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Follow-ups */}
          {data.upcomingTasks.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Upcoming Follow-ups (Next 7 days)
              </h2>
              <div className="space-y-3">
                {data.upcomingTasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/inbox?contactId=${task.contactId}`}
                    className="flex items-start justify-between p-3 bg-gray-700 rounded hover:bg-gray-600 transition group"
                  >
                    <div className="flex-1">
                      <p className="font-medium group-hover:text-amber-400 transition">
                        {task.title}
                      </p>
                      <p className="text-sm text-gray-400">
                        {task.contact.name || task.contact.phoneNumber}
                      </p>
                      <p className="text-xs text-gray-500 pt-1">
                        Due: {format(new Date(task.dueDate), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium ${
                          task.priority === 'HIGH'
                            ? 'bg-red-900 text-red-200'
                            : task.priority === 'MEDIUM'
                            ? 'bg-amber-900 text-amber-200'
                            : 'bg-gray-600 text-gray-200'
                        }`}
                      >
                        {task.priority}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition" />
                    </div>
                  </Link>
                ))}
              </div>
              <Link
                href="/tasks"
                className="text-sm text-blue-400 hover:text-blue-300 font-medium mt-4 inline-block"
              >
                View all tasks →
              </Link>
            </div>
          )}

          {/* Recent Activity */}
          {data.recentActivities.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Recent Activity
              </h2>
              <div className="space-y-3">
                {data.recentActivities.map((activity) => (
                  <Link
                    key={activity.id}
                    href={`/inbox?contactId=${activity.contactId}`}
                    className="flex items-start gap-3 p-3 bg-gray-700 rounded hover:bg-gray-600 transition group"
                  >
                    <div className="flex-shrink-0 pt-1">
                      {activity.actor.avatarUrl ? (
                        <img
                          src={activity.actor.avatarUrl}
                          alt={activity.actor.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold">
                          {activity.actor.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium group-hover:text-blue-400 transition truncate">
                        {activity.title}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-gray-400 truncate">
                          {activity.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 pt-1">
                        {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - This Month Stats */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 sticky top-6">
            <h2 className="text-lg font-semibold mb-4">This Month</h2>
            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">New Contacts Added</p>
                <p className="text-3xl font-bold pt-1">{data.newContactsMonth}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pipeline Total</p>
                <p className="text-3xl font-bold pt-1">
                  ₦{data.pipelineTotal.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Tasks Completed</p>
                <p className="text-3xl font-bold pt-1">{data.completedTasksMonth}</p>
              </div>
              <hr className="border-gray-700 my-4" />
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/inbox"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded font-medium text-sm transition text-center"
                >
                  Inbox
                </Link>
                <Link
                  href="/contacts"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded font-medium text-sm transition text-center"
                >
                  Contacts
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
