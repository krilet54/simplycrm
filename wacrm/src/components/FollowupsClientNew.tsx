'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { ContactType } from '@/types';

interface FollowupsTab {
  active: number;
  completed: number;
  overdue: number;
}

export default function FollowupsClient() {
  const [tab, setTab] = useState<'PENDING' | 'COMPLETED' | 'OVERDUE'>('PENDING');
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [stats, setStats] = useState<FollowupsTab>({ active: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [formData, setFormData] = useState({
    contactId: '',
    note: '',
    dueDate: '',
  });

  // Fetch follow-ups
  useEffect(() => {
    const fetchFollowUps = async () => {
      try {
        let query = '/api/followups?isDone=false';
        if (tab === 'COMPLETED') query = '/api/followups?isDone=true';
        if (tab === 'OVERDUE') query = '/api/followups?overdue=true';

        const res = await fetch(query);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setFollowUps(data.followUps || []);

        // Fetch stats
        const statsRes = await fetch('/api/followups');
        if (statsRes.ok) {
          const allData = await statsRes.json();
          setStats({
            active: allData.followUps?.filter((f: any) => !f.isDone && new Date(f.dueDate) >= new Date()).length || 0,
            completed: allData.followUps?.filter((f: any) => f.isDone).length || 0,
            overdue: allData.followUps?.filter((f: any) => !f.isDone && new Date(f.dueDate) < new Date()).length || 0,
          });
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowUps();
  }, [tab]);

  // Fetch contacts for modal
  useEffect(() => {
    if (showAddModal && !showContactModal && contacts.length === 0) {
      fetch('/api/contacts')
        .then(res => res.json())
        .then(data => setContacts(data.contacts || []))
        .catch(err => console.error(err));
    }
  }, [showAddModal, showContactModal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactId || !formData.dueDate) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: formData.contactId,
          note: formData.note || undefined,
          dueDate: new Date(formData.dueDate).toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to create');
      toast.success('Follow-up scheduled');
      setFormData({ contactId: '', note: '', dueDate: '' });
      setShowAddModal(false);
      setTab('PENDING'); // Refresh
    } catch (error) {
      toast.error('Failed to create follow-up');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone: true }),
      });

      if (!res.ok) throw new Error('Failed to update');
      toast.success('Follow-up marked as done');
      setTab('PENDING'); // Refresh
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-gray-600 mt-1">Manage your follow-ups and stay on top of contacts</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + Schedule Follow-up
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
            Pending ({stats.active})
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

      {/* Follow-ups List */}
      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : followUps.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">
              {tab === 'PENDING' && 'No pending follow-ups'}
              {tab === 'COMPLETED' && 'No completed follow-ups'}
              {tab === 'OVERDUE' && 'No overdue follow-ups'}
            </p>
          </div>
        ) : (
          followUps.map((fu) => (
            <div key={fu.id} className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{fu.contact?.name || 'Unknown Contact'}</p>
                  {fu.note && <p className="text-sm text-gray-600 mt-1">{fu.note}</p>}
                  <p className="text-sm text-gray-500 mt-2">
                    Due: {new Date(fu.dueDate).toLocaleDateString()}
                  </p>
                </div>
                {tab !== 'COMPLETED' && (
                  <button
                    onClick={() => handleComplete(fu.id)}
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

      {/* Add Follow-up Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Schedule Follow-up</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                <select
                  value={formData.contactId}
                  onChange={(e) => setFormData({ ...formData, contactId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a contact...</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.phoneNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Add a note..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
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
