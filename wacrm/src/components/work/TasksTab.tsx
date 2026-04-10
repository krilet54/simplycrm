'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { ContactType, UserType } from '@/types';
import { useContactPanel } from '@/lib/store';

interface User {
  id: string;
  name: string;
  role: string;
}

interface TaskStats {
  pending: number;
  completed: number;
  overdue: number;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate: string;
  createdBy?: { id: string; name: string };
  assignedTo?: { id: string; name: string };
  contact?: ContactType;
}

interface TasksTabProps {
  user: UserType | null | undefined;
  workspace: any;
  onItemCompleted?: () => void;
}

export default function TasksTab({ user, workspace, onItemCompleted }: TasksTabProps) {
  const contactPanel = useContactPanel();
  const [tab, setTab] = useState<'PENDING' | 'COMPLETED' | 'OVERDUE'>('PENDING');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({ pending: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactId: '',
    assignedToId: '',
    dueDate: '',
    priority: 'MEDIUM',
  });

  // Fetch tasks
  useEffect(() => {
    if (!user?.role) {
      console.warn('⚠️ User role not available:', { userId: user?.id, role: user?.role });
      return;
    }
    
    const fetchTasks = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        // Map tabs to correct status values
        let query = `/api/tasks?status=TODO&userRole=${user.role}&withStats=true&limit=100`;
        if (tab === 'COMPLETED') query = `/api/tasks?status=DONE&userRole=${user.role}&withStats=true&limit=100`;
        if (tab === 'OVERDUE') query = `/api/tasks?overdue=true&userRole=${user.role}&withStats=true&limit=100`;

        console.log('📡 Fetching tasks:', { query, userRole: user.role });

        const res = await fetch(query, { credentials: 'include' });
        console.log('📡 Tasks response status:', res.status);
        
        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          console.error('❌ Tasks API error response:', error);
          throw new Error(`[${res.status}] ${error.error || error.details || 'Failed to fetch tasks'}`);
        }
        const data = await res.json();
        console.log('✅ Tasks loaded:', { count: data.tasks?.length || 0 });
        setTasks(data.tasks || []);

        if (data.stats) {
          setStats(data.stats);
        } else {
          setStats({
            pending: data.tasks?.filter((t: Task) => t.status === 'TODO').length || 0,
            completed: data.tasks?.filter((t: Task) => t.status === 'DONE').length || 0,
            overdue: data.tasks?.filter(
              (t: Task) => t.status === 'TODO' && new Date(t.dueDate) < new Date()
            ).length || 0,
          });
        }
      } catch (error) {
        console.error('❌ Error fetching tasks:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load tasks');
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchTasks(false);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchTasks(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [tab, user?.role]);

  // Fetch contacts and team members for modal
  useEffect(() => {
    if (showAddModal) {
      Promise.all([
        contacts.length === 0
          ? fetch('/api/contacts', { credentials: 'include' })
              .then((res) => res.json())
              .then((data) => setContacts(data.contacts || []))
          : Promise.resolve(),
        fetch('/api/workspace/members', { credentials: 'include' })
          .then((res) => res.json())
          .then((data) => setTeamMembers(data.members || []))
          .catch((err) => console.error('Failed to fetch team members:', err)),
      ]).catch((err) => console.error('Error fetching modal data:', err));
    }
  }, [showAddModal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.dueDate) {
      toast.error('Please fill in title and due date');
      return;
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          contactId: formData.contactId || undefined,
          assignedToId: formData.assignedToId || undefined,
          dueDate: new Date(formData.dueDate).toISOString(),
          priority: formData.priority,
        }),
      });

      if (!res.ok) throw new Error('Failed to create task');
      
      const data = await res.json();
      console.log('✅ Task created:', data.task);
      
      // Add new task to the list immediately (real-time update)
      if (data.task) {
        setTasks(prevTasks => [data.task, ...prevTasks]);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: prev.pending + (data.task.status === 'TODO' ? 1 : 0),
        }));
      }
      
      toast.success('Task created');
      setFormData({
        title: '',
        description: '',
        contactId: '',
        assignedToId: '',
        dueDate: '',
        priority: 'MEDIUM',
      });
      setShowAddModal(false);
      
      // Notify parent to refresh counts
      onItemCompleted?.();
    } catch (error) {
      console.error('❌ Error creating task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
    }
  };

  const handleComplete = async (taskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'DONE' }),
      });

      if (!res.ok) throw new Error('Failed to mark task complete');
      
      const data = await res.json();
      console.log('✅ Task marked complete:', data.task);
      
      // Update task in state immediately (real-time update)
      if (data.task) {
        setTasks(prevTasks =>
          prevTasks.map(t => (t.id === taskId ? data.task : t)).filter(t => t.status !== 'DONE')
        );
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          completed: prev.completed + 1,
        }));
      }
      
      toast.success('Task marked complete');
      
      // Notify parent to refresh counts
      onItemCompleted?.();
      
      // Trigger contact panel refresh to update activity tab
      if (contactPanel?.triggerRefresh) {
        setTimeout(() => {
          console.log('🔄 Triggering contact panel refresh from TasksTab');
          contactPanel.triggerRefresh();
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error completing task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Delete this task?')) return;
    
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete task');
      }
      
      // Remove task from state
      const deletedTask = tasks.find(t => t.id === taskId);
      setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId));
      
      // Update stats
      if (deletedTask) {
        setStats(prev => ({
          ...prev,
          pending: deletedTask.status === 'TODO' ? Math.max(0, prev.pending - 1) : prev.pending,
          completed: deletedTask.status === 'DONE' ? Math.max(0, prev.completed - 1) : prev.completed,
          overdue: deletedTask.status === 'TODO' && new Date(deletedTask.dueDate) < new Date() 
            ? Math.max(0, prev.overdue - 1) : prev.overdue,
        }));
      }
      
      toast.success('Task deleted');
      onItemCompleted?.();
    } catch (error) {
      console.error('❌ Error deleting task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'MEDIUM':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'LOW':
        return 'bg-green-50 text-green-700 border border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  if (!user) return <div className="text-gray-500 p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.pending}</div>
        </div>
        <div className="p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">Overdue</div>
          <div className="text-2xl font-semibold text-red-600 mt-1">{stats.overdue}</div>
        </div>
        <div className="p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.completed}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        {['PENDING', 'OVERDUE', 'COMPLETED'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-blue-500 text-gray-900'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'PENDING' && `Pending (${stats.pending})`}
            {t === 'OVERDUE' && `Overdue (${stats.overdue})`}
            {t === 'COMPLETED' && `Completed (${stats.completed})`}
          </button>
        ))}
      </div>

      {/* Create Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
      >
        + Create Task
      </button>

      {/* Tasks List */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-gray-100 rounded animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border border-gray-200 rounded bg-gray-50">
            <p className="text-sm">
              {tab === 'PENDING' && 'No pending tasks'}
              {tab === 'COMPLETED' && 'No completed tasks'}
              {tab === 'OVERDUE' && 'No overdue tasks'}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 border border-gray-200 rounded hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.contact && (
                      <span className="text-xs text-gray-600">📞 {task.contact.name}</span>
                    )}
                    {task.assignedTo && task.assignedTo.id !== user?.id && (
                      <span className="text-xs text-gray-600">→ {task.assignedTo.name}</span>
                    )}
                    <span className="text-xs text-gray-500 ml-auto">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tab !== 'COMPLETED' && (task.assignedTo?.id === user?.id || user?.role === 'OWNER' || user?.role === 'ADMIN') && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
                    >
                      Done
                    </button>
                  )}
                  {(user?.role === 'OWNER' || user?.role === 'ADMIN' || task.createdBy?.id === user?.id) && (
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="px-2 py-1.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Delete task"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-gray-200 shadow-lg max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Create Task</h2>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact (optional)</label>
                <select
                  value={formData.contactId}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">None</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.phoneNumber}
                    </option>
                  ))}
                </select>
              </div>

              {(user?.role === 'OWNER' || user?.role === 'ADMIN') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                  <select
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Assign to yourself</option>
                    {teamMembers
                      .filter((m) => m.id !== user?.id)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded font-medium text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
