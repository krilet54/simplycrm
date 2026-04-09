'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { ContactType } from '@/types';

interface TasksStats {
  pending: number;
  completed: number;
  overdue: number;
}

export default function TasksClient() {
  const [tab, setTab] = useState<'PENDING' | 'COMPLETED' | 'OVERDUE'>('PENDING');
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState<TasksStats>({ pending: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactId: '',
    dueDate: '',
    priority: 'MEDIUM',
  });

  // Fetch tasks
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        let query = '/api/tasks?status=TODO';
        if (tab === 'COMPLETED') query = '/api/tasks?status=DONE';
        if (tab === 'OVERDUE') query = '/api/tasks?overdue=true';

        const res = await fetch(query);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setTasks(data.tasks || []);

        // Fetch stats
        const statusRes = await fetch('/api/tasks');
        if (statusRes.ok) {
          const allData = await statusRes.json();
          setStats({
            pending: allData.tasks?.filter((t: any) => t.status === 'TODO').length || 0,
            completed: allData.tasks?.filter((t: any) => t.status === 'DONE').length || 0,
            overdue: allData.tasks?.filter((t: any) => t.status === 'TODO' && new Date(t.dueDate) < new Date()).length || 0,
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [tab]);

  // Fetch contacts for modal
  useEffect(() => {
    if (showAddModal && contacts.length === 0) {
      fetch('/api/contacts')
        .then(res => res.json())
        .then(data => setContacts(data.contacts || []))
        .catch(err => console.error(err));
    }
  }, [showAddModal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.dueDate) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          contactId: formData.contactId || undefined,
          dueDate: new Date(formData.dueDate).toISOString(),
          priority: formData.priority,
        }),
      });

      if (!res.ok) throw new Error('Failed to create');
      
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
      setFormData({ title: '', description: '', contactId: '', dueDate: '', priority: 'MEDIUM' });
      setShowAddModal(false);
    } catch (error) {
      console.error('❌ Error creating task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create task');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DONE' }),
      });

      if (!res.ok) throw new Error('Failed to update');
      
      const data = await res.json();
      console.log('✅ Task marked complete:', data.task);
      
      // Update task in state immediately (real-time update)
      if (data.task) {
        setTasks(prevTasks =>
          prevTasks.map(t => (t.id === id ? data.task : t)).filter(t => t.status !== 'DONE')
        );
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          completed: prev.completed + 1,
        }));
      }
      
      toast.success('Task marked as completed');
    } catch (error) {
      console.error('❌ Error completing task:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-100 text-red-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'LOW':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">Manage your tasks and stay organized</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + Create Task
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setTab('PENDING')}
            className={`px-1 py-2 font-medium border-b-2 transition-colors ${
              tab === 'PENDING'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending ({stats.pending})
          </button>
          <button
            onClick={() => setTab('OVERDUE')}
            className={`px-1 py-2 font-medium border-b-2 transition-colors ${
              tab === 'OVERDUE'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overdue ({stats.overdue})
          </button>
          <button
            onClick={() => setTab('COMPLETED')}
            className={`px-1 py-2 font-medium border-b-2 transition-colors ${
              tab === 'COMPLETED'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed ({stats.completed})
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : tasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">
              {tab === 'PENDING' && 'No pending tasks'}
              {tab === 'COMPLETED' && 'No completed tasks'}
              {tab === 'OVERDUE' && 'No overdue tasks'}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{task.title}</p>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.contact && (
                      <span className="text-sm text-gray-500">{task.contact.name || task.contact.phoneNumber}</span>
                    )}
                    <span className="text-sm text-gray-500">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {tab !== 'COMPLETED' && (
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create Task</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Task description..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact (optional)</label>
                <select
                  value={formData.contactId}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.phoneNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                  <input
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
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
