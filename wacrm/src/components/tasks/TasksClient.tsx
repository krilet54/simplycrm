'use client';

import { useState, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Trash2, Plus, AlertCircle, FileText, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { TaskType2, TaskStatus, TaskPriority } from '@/types';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  tax: number;
  subtotal: number;
  dueDate: string | Date | null;
  paidAt: string | Date | null;
  createdAt: string | Date;
  contact: Contact;
  items: InvoiceItem[];
}

interface TasksClientProps {
  initialTasks: TaskType2[];
  initialInvoices?: Invoice[];
  stats: {
    totalTasks: number;
    completedToday: number;
    pastDue: number;
    overdue: number;
  };
  invoiceStats?: {
    totalOutstanding: number;
    totalPaidThisMonth: number;
    outstandingCount: number;
    paidThisMonthCount: number;
  };
  currentUser: any;
  workspace: any;
}

type FilterStatus = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
type InvoiceFilterType = 'all' | 'outstanding' | 'paid' | 'overdue' | 'draft';
type TabType = 'tasks' | 'invoices';

export default function TasksClient({ 
  initialTasks, 
  initialInvoices = [], 
  stats, 
  invoiceStats,
  currentUser, 
  workspace 
}: TasksClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tasks');
  const [tasks, setTasks] = useState<TaskType2[]>(initialTasks);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilterType>('all');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'ALL') return true;
    if (filter === 'OVERDUE') {
      return task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date();
    }
    return task.status === filter;
  });

  const filteredInvoices = invoices.filter(invoice => {
    if (invoiceFilter === 'outstanding' && invoice.status !== 'SENT' && invoice.status !== 'OVERDUE') return false;
    if (invoiceFilter === 'paid' && invoice.status !== 'PAID') return false;
    if (invoiceFilter === 'overdue' && invoice.status !== 'OVERDUE') return false;
    if (invoiceFilter === 'draft' && invoice.status !== 'DRAFT') return false;
    return true;
  });

  const handleCompleteTask = useCallback(async (taskId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) {
        const { task } = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? task : t)));
        toast.success('Task completed!');
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
      toast.error('Failed to complete task');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        toast.success('Task deleted');
      } else {
        toast.error('Can only delete TODO tasks');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID', paidAt: new Date().toISOString() }),
      });
      if (!res.ok) throw new Error('Failed to update invoice');
      toast.success('Invoice marked as paid');
      router.refresh();
    } catch (err) {
      toast.error('Failed to update invoice');
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-800';
      case 'LOW':
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'IN_PROGRESS':
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const isOverdue = (task: TaskType2) =>
    task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    PAID: 'bg-green-100 text-green-700',
    OVERDUE: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition ${
              activeTab === 'tasks'
                ? 'border-forest-600 text-forest-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardList className="w-5 h-5" />
            <span className="font-medium">Follow-ups & Tasks</span>
            {stats.overdue > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {stats.overdue}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 pb-3 border-b-2 transition ${
              activeTab === 'invoices'
                ? 'border-forest-600 text-forest-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-medium">Invoices</span>
            {invoiceStats && invoiceStats.outstandingCount > 0 && (
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {invoiceStats.outstandingCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'tasks' && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Follow-ups</h1>
                <p className="text-gray-600 mt-1">Manage and track all your follow-up tasks</p>
              </div>
              <Link
                href="/tasks/new"
                className="bg-forest-600 hover:bg-forest-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                New Task
              </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <p className="text-gray-600 text-sm mb-1">Active Tasks</p>
                <p className="text-3xl font-bold text-blue-900">{stats.totalTasks}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <p className="text-gray-600 text-sm mb-1">Completed Today</p>
                <p className="text-3xl font-bold text-green-900">{stats.completedToday}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
                <p className="text-gray-600 text-sm mb-1">Past Due</p>
                <p className="text-3xl font-bold text-amber-900">{stats.pastDue}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                <p className="text-gray-600 text-sm mb-1">Overdue</p>
                <p className="text-3xl font-bold text-red-900">{stats.overdue}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
              {(['ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    filter === f
                      ? 'bg-forest-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Tasks Table */}
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No tasks in this filter</p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Task</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTasks.map((task) => (
                      <tr
                        key={task.id}
                        className={`hover:bg-gray-50 transition ${
                          task.status === 'COMPLETED' ? 'bg-gray-50' : ''
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center">
                            {getStatusIcon(task.status)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <p
                              className={`font-medium ${
                                task.status === 'COMPLETED'
                                  ? 'line-through text-gray-500'
                                  : 'text-gray-900'
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/inbox?contactId=${task.contactId}`}
                            className="text-forest-600 hover:underline text-sm font-medium"
                          >
                            {task.contact?.name || task.contact?.phoneNumber}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {isOverdue(task) && (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={`text-sm ${isOverdue(task) ? 'text-red-600 font-semibold' : 'text-gray-600'}`} suppressHydrationWarning>
                              {format(new Date(task.dueDate), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {task.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                disabled={loading}
                                className="text-green-600 hover:text-green-700 font-medium text-sm transition disabled:opacity-50"
                              >
                                Done
                              </button>
                            )}
                            {task.status === 'TODO' && (
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                disabled={loading}
                                className="text-red-600 hover:text-red-700 transition disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === 'invoices' && (
          <>
            {/* Invoice Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
                <p className="text-gray-600 mt-1">Track payments and outstanding balances</p>
              </div>
            </div>

            {/* Invoice Stats */}
            {invoiceStats && (
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-5 border border-amber-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-200 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-700" />
                    </div>
                    <div>
                      <p className="text-amber-700 font-medium">Outstanding</p>
                      <p className="text-2xl font-bold text-amber-900" suppressHydrationWarning>
                        {formatCurrency(invoiceStats.totalOutstanding)}
                      </p>
                      <p className="text-sm text-amber-600">{invoiceStats.outstandingCount} pending</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-200 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-700" />
                    </div>
                    <div>
                      <p className="text-green-700 font-medium">Collected This Month</p>
                      <p className="text-2xl font-bold text-green-900" suppressHydrationWarning>
                        {formatCurrency(invoiceStats.totalPaidThisMonth)}
                      </p>
                      <p className="text-sm text-green-600">{invoiceStats.paidThisMonthCount} paid</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Filters */}
            <div className="flex gap-2 mb-6 border-b border-gray-200 pb-4">
              {([
                { key: 'all', label: 'All' },
                { key: 'outstanding', label: 'Outstanding' },
                { key: 'paid', label: 'Paid' },
                { key: 'overdue', label: 'Overdue' },
                { key: 'draft', label: 'Draft' },
              ] as const).map((f) => (
                <button
                  key={f.key}
                  onClick={() => setInvoiceFilter(f.key)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                    invoiceFilter === f.key
                      ? 'bg-forest-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Invoices List */}
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No invoices found</p>
                <p className="text-sm text-gray-400 mt-1">Create invoices from the contact inbox</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredInvoices.map(invoice => (
                  <div
                    key={invoice.id}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-gray-900">{invoice.contact.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
                            {invoice.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-0.5">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-400 mt-1">{invoice.contact.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900" suppressHydrationWarning>
                          {formatCurrency(invoice.total)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1" suppressHydrationWarning>
                          {invoice.dueDate 
                            ? `Due ${format(new Date(invoice.dueDate), 'MMM d, yyyy')}`
                            : format(new Date(invoice.createdAt), 'MMM d, yyyy')
                          }
                        </p>
                      </div>
                    </div>

                    {invoice.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          {invoice.items.slice(0, 2).map((item, i) => (
                            <span key={item.id}>
                              {i > 0 && ', '}
                              {item.description} ({item.quantity}x)
                            </span>
                          ))}
                          {invoice.items.length > 2 && (
                            <span className="text-gray-400"> +{invoice.items.length - 2} more</span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3">
                      <Link
                        href={`/dashboard/inbox?contactId=${invoice.contact.id}`}
                        className="text-sm text-forest-600 hover:text-forest-700 font-medium"
                      >
                        View Contact
                      </Link>
                      {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                        <>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => handleMarkInvoicePaid(invoice.id)}
                            className="text-sm text-green-600 hover:text-green-700 font-medium"
                          >
                            Mark as Paid
                          </button>
                        </>
                      )}
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={() => window.open(`/api/invoices/${invoice.id}?format=pdf`, '_blank')}
                        className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
