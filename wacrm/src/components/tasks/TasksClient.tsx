'use client';

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { CheckCircle2, Clock, Trash2, Plus, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { TaskType2, TaskStatus, TaskPriority } from '@/types';

interface TasksClientProps {
  initialTasks: TaskType2[];
  stats: {
    totalTasks: number;
    completedToday: number;
    pastDue: number;
    overdue: number;
  };
  currentUser: any;
  workspace: any;
}

type FilterStatus = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export default function TasksClient({ initialTasks, stats, currentUser, workspace }: TasksClientProps) {
  const [tasks, setTasks] = useState<TaskType2[]>(initialTasks);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [loading, setLoading] = useState(false);

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'ALL') return true;
    if (filter === 'OVERDUE') {
      return task.status !== 'COMPLETED' && new Date(task.dueDate) < new Date();
    }
    return task.status === filter;
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
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
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
      } else {
        alert('Can only delete TODO tasks');
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Follow-ups</h1>
            <p className="text-gray-600 mt-1">Manage and track all your follow-up tasks</p>
          </div>
          <Link
            href="/tasks/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition"
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
                  ? 'bg-blue-600 text-white'
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
                        href={`/inbox?contactId=${task.contactId}`}
                        className="text-blue-600 hover:underline text-sm font-medium"
                      >
                        {task.contact?.name || task.contact?.phoneNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isOverdue(task) && (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className={`text-sm ${isOverdue(task) ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
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
      </div>
    </div>
  );
}
