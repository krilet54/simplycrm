'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { ContactType, UserType } from '@/types';
import { useContactPanel } from '@/lib/store';

interface User {
  id: string;
  name: string;
  role: string;
}

interface FollowupStats {
  pending: number;
  completed: number;
  overdue: number;
}

interface Followup {
  id: string;
  note?: string;
  dueDate: string;
  isDone: boolean;
  contact: ContactType;
}

interface FollowupsTabProps {
  user: UserType | null | undefined;
  workspace: any;
  onItemCompleted?: () => void;
}

export default function FollowupsTab({ user, workspace, onItemCompleted }: FollowupsTabProps) {
  const contactPanel = useContactPanel();
  const [tab, setTab] = useState<'PENDING' | 'COMPLETED' | 'OVERDUE'>('PENDING');
  const [followups, setFollowups] = useState<Followup[]>([]);
  const [stats, setStats] = useState<FollowupStats>({ pending: 0, completed: 0, overdue: 0 });
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    contactId: '',
    note: '',
    dueDate: '',
  });

  // Fetch follow-ups
  useEffect(() => {
    const fetchFollowups = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        let query = '/api/followups?isDone=false&withStats=true&limit=100';
        if (tab === 'COMPLETED') query = '/api/followups?isDone=true&withStats=true&limit=100';
        if (tab === 'OVERDUE') query = '/api/followups?overdue=true&withStats=true&limit=100';

        const res = await fetch(query, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setFollowups(data.followUps || []);

        if (data.stats) {
          setStats(data.stats);
        } else {
          setStats({
            pending:
              data.followUps?.filter((f: Followup) => !f.isDone && new Date(f.dueDate) >= new Date()).length || 0,
            completed: data.followUps?.filter((f: Followup) => f.isDone).length || 0,
            overdue:
              data.followUps?.filter((f: Followup) => !f.isDone && new Date(f.dueDate) < new Date()).length || 0,
          });
        }
      } catch (error) {
        console.error('Error fetching follow-ups:', error);
        toast.error('Failed to load follow-ups');
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchFollowups(false);
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchFollowups(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [tab]);

  // Fetch contacts for modal
  useEffect(() => {
    if (showAddModal && contacts.length === 0) {
      fetch('/api/contacts', { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => setContacts(data.contacts || []))
        .catch((err) => console.error('Error fetching contacts:', err));
    }
  }, [showAddModal]);

  // Handle clicking outside the dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Reset search when modal closes
  useEffect(() => {
    if (!showAddModal) {
      setSearchQuery('');
      setIsOpen(false);
    }
  }, [showAddModal]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contactId || !formData.dueDate) {
      toast.error('Please select a contact and due date');
      return;
    }

    try {
      const res = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          contactId: formData.contactId,
          note: formData.note || undefined,
          dueDate: new Date(formData.dueDate).toISOString(),
        }),
      });

      if (!res.ok) throw new Error('Failed to create');
      
      const data = await res.json();
      console.log('✅ Follow-up created:', data.followUp);
      
      // Add new follow-up to the list immediately (real-time update)
      if (data.followUp) {
        setFollowups(prevFollowups => [data.followUp, ...prevFollowups]);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: prev.pending + (!data.followUp.isDone ? 1 : 0),
        }));
      }
      
      toast.success('Follow-up scheduled');
      setFormData({ contactId: '', note: '', dueDate: '' });
      setShowAddModal(false);
      
      // Notify parent to refresh counts
      onItemCompleted?.();
    } catch (error) {
      console.error('❌ Error creating follow-up:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create follow-up');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isDone: true }),
      });

      if (!res.ok) throw new Error('Failed to update');
      
      const data = await res.json();
      console.log('✅ Follow-up marked done:', data.followUp);
      
      // Update follow-up in state immediately (real-time update)
      if (data.followUp) {
        setFollowups(prevFollowups =>
          prevFollowups.map(f => (f.id === id ? data.followUp : f)).filter(f => !f.isDone)
        );
        
        // Update stats
        setStats(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          completed: prev.completed + 1,
        }));
      }
      
      toast.success('Follow-up marked as done');
      
      // Notify parent to refresh counts
      onItemCompleted?.();
      
      // Trigger contact panel refresh to update activity tab
      if (contactPanel?.triggerRefresh) {
        setTimeout(() => {
          console.log('🔄 Triggering contact panel refresh from FollowupsTab');
          contactPanel.triggerRefresh();
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error completing follow-up:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update follow-up');
    }
  };

  // Filter contacts based on search query (by name or phone number)
  const getFilteredContacts = () => {
    if (!searchQuery.trim()) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(
      (c) =>
        (c.name?.toLowerCase().includes(query) || false) ||
        (c.phoneNumber?.toLowerCase().includes(query) || false)
    );
  };

  // Get the selected contact for display
  const selectedContact = contacts.find((c) => c.id === formData.contactId);

  const tabConfig = { PENDING: '', COMPLETED: '', OVERDUE: '' };

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
        <button
          onClick={() => setTab('PENDING')}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'PENDING'
              ? 'border-blue-500 text-gray-900'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Pending ({stats.pending})
        </button>
        <button
          onClick={() => setTab('OVERDUE')}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'OVERDUE'
              ? 'border-red-500 text-gray-900'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Overdue ({stats.overdue})
        </button>
        <button
          onClick={() => setTab('COMPLETED')}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'COMPLETED'
              ? 'border-blue-500 text-gray-900'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Completed ({stats.completed})
        </button>
      </div>

      {/* Create Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
      >
        + Schedule Follow-up
      </button>

      {/* Follow-ups List */}
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
        ) : followups.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border border-gray-200 rounded bg-gray-50">
            <p className="text-sm">
              {tab === 'PENDING' && 'No pending follow-ups'}
              {tab === 'COMPLETED' && 'No completed follow-ups'}
              {tab === 'OVERDUE' && 'No overdue follow-ups'}
            </p>
          </div>
        ) : (
          followups.map((fu) => (
            <div
              key={fu.id}
              className="p-4 border border-gray-200 rounded hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{fu.contact?.name || 'Unknown Contact'}</p>
                  {fu.note && (
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">💡 {fu.note}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">📅 {new Date(fu.dueDate).toLocaleDateString()}</p>
                </div>
                {tab !== 'COMPLETED' && (
                  <button
                    onClick={() => handleComplete(fu.id)}
                    className="shrink-0 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
                  >
                    Done
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Schedule Follow-up Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded border border-gray-200 shadow-lg max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Schedule Follow-up</h2>
            </div>

            {/* Form */}
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact *</label>
                <div ref={dropdownRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-left bg-white hover:bg-gray-50 transition-colors"
                  >
                    {selectedContact ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{selectedContact.name}</span>
                        <span className="text-xs text-gray-500">{selectedContact.phoneNumber}</span>
                      </div>
                    ) : (
                      <span className="text-gray-500">Select a contact...</span>
                    )}
                  </button>

                  {/* Search Input (when open) */}
                  {isOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 border border-gray-300 bg-white rounded shadow-lg z-10">
                      <input
                        type="text"
                        placeholder="Search by name or phone number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                        className="w-full px-3 py-2 border-b border-gray-200 focus:outline-none text-sm"
                      />
                      
                      {/* Dropdown Options */}
                      <div className="max-h-64 overflow-y-auto">
                        {getFilteredContacts().length === 0 ? (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No contacts found
                          </div>
                        ) : (
                          getFilteredContacts().map((contact) => (
                            <button
                              key={contact.id}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, contactId: contact.id });
                                setIsOpen(false);
                                setSearchQuery('');
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900">{contact.name}</span>
                                <span className="text-xs text-gray-600">{contact.phoneNumber}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date & Time *</label>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="What to follow up on..."
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm transition-colors"
                >
                  Schedule
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
