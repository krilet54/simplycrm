'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { ContactType } from '@/types';

interface MyWorkStats {
  active: number;
  completed: number;
}

interface MyWorkData {
  assignments: ContactType[];
  stats: MyWorkStats;
}

export default function MyWorkPanel() {
  const [tab, setTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [data, setData] = useState<MyWorkData>({ assignments: [], stats: { active: 0, completed: 0 } });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyWork = async () => {
      try {
        const res = await fetch(`/api/contacts/my-work?status=${tab}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const result = await res.json();
        setData(result);
      } catch (error) {
        toast.error('Failed to load my work');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyWork();
  }, [tab]);

  const handleComplete = async (contactId: string) => {
    try {
      const res = await fetch(`/api/contacts/assignments/${contactId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to complete');
      toast.success('Work marked as completed');
      setTab('ACTIVE'); // Refresh active tab
    } catch (error) {
      toast.error('Failed to complete work');
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        <button
          onClick={() => setTab('ACTIVE')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'ACTIVE'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Active ({data.stats.active})
        </button>
        <button
          onClick={() => setTab('COMPLETED')}
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'COMPLETED'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-gray-400 hover:text-gray-300'
          }`}
        >
          Completed ({data.stats.completed})
        </button>
      </div>

      {/* Assignments List */}
      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : data.assignments.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            {tab === 'ACTIVE' ? 'No active assignments' : 'No completed assignments'}
          </p>
        ) : (
          data.assignments.map((contact) => (
            <div
              key={contact.id}
              className="p-3 bg-gray-900 rounded border border-gray-700 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{contact.name || 'Unnamed'}</p>
                  {contact.delegationNote && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{contact.delegationNote}</p>
                  )}
                  {contact.assignedAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(contact.assignedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {tab === 'ACTIVE' && (
                  <button
                    onClick={() => handleComplete(contact.id)}
                    className="shrink-0 px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
