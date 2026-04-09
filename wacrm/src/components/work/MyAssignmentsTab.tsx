'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { ContactType, UserType } from '@/types';
import { AssignModal } from '@/components/delegation/AssignModal';

interface MyAssignmentStats {
  active: number;
  completed: number;
  delegated: number;
}

interface MyAssignmentsTabProps {
  user: UserType | null | undefined;
  workspace: any;
  onItemCompleted?: () => void;
}

export default function MyAssignmentsTab({ user, workspace, onItemCompleted }: MyAssignmentsTabProps) {
  const [tab, setTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [assignments, setAssignments] = useState<ContactType[]>([]);
  const [delegatedContacts, setDelegatedContacts] = useState<ContactType[]>([]);
  const [stats, setStats] = useState<MyAssignmentStats>({ active: 0, completed: 0, delegated: 0 });
  const [loading, setLoading] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';

  // Fetch agent's assignments (for agents only)
  useEffect(() => {
    if (!user?.role || isOwnerOrAdmin) return;
    
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/contacts/my-work?status=${tab}&userRole=${user.role}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setAssignments(data.assignments || []);
        setStats(data.stats || { active: 0, completed: 0, delegated: 0 });
      } catch (error) {
        console.error('Error fetching assignments:', error);
        toast.error('Failed to load assignments');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [tab, user?.role, isOwnerOrAdmin, refreshKey]);

  // Fetch owner's delegated contacts (for owner/admin only)
  useEffect(() => {
    if (!user?.role || !isOwnerOrAdmin) return;
    
    const fetchDelegated = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/contacts/my-work?action=delegated', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setDelegatedContacts(data.contacts || []);
        setStats(prev => ({ ...prev, delegated: data.contacts?.length || 0 }));
      } catch (error) {
        console.error('Error fetching delegated contacts:', error);
        toast.error('Failed to load delegated contacts');
      } finally {
        setLoading(false);
      }
    };

    fetchDelegated();
  }, [user?.role, isOwnerOrAdmin, refreshKey]);

  const handleComplete = async (contactId: string) => {
    try {
      const res = await fetch(`/api/contacts/assignments/${contactId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete assignment');
      }
      toast.success('Assignment marked as done');
      setRefreshKey(k => k + 1);
      
      // Notify parent to refresh counts
      onItemCompleted?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete assignment');
    }
  };

  const handleUnassign = async (contactId: string) => {
    if (!confirm('Are you sure you want to take away this contact from the agent?')) return;
    
    try {
      const res = await fetch('/api/contacts/my-work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'unassign', contactId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unassign');
      }
      toast.success('Contact unassigned from agent');
      setRefreshKey(k => k + 1);
      
      // Notify parent to refresh counts
      onItemCompleted?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unassign contact');
    }
  };

  const handleAssignSuccess = () => {
    setShowAssignModal(false);
    setSelectedContactId(null);
    setRefreshKey(k => k + 1);
    
    // Notify parent to refresh counts
    onItemCompleted?.();
  };

  if (!user) return <div className="text-gray-500">Loading...</div>;

  // ============ OWNER/ADMIN VIEW - Delegated Contacts List ============
  if (isOwnerOrAdmin) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
          📋 Contacts you've assigned to your team members
        </div>

        {/* Stats */}
        <div className="p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">Delegated Contacts</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.delegated}</div>
        </div>

        {/* Delegated Contacts List */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-gray-100 rounded animate-pulse">
                  <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : delegatedContacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500 border border-gray-200 rounded bg-gray-50">
              <p className="text-sm">No contacts delegated yet</p>
              <p className="text-xs mt-2 text-gray-400">Go to a contact's profile and click "Assign" to delegate</p>
            </div>
          ) : (
            delegatedContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-4 border border-gray-200 rounded hover:shadow-sm transition-shadow bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Contact Name & Phone */}
                    <p className="font-medium text-gray-900">{contact.name || 'Unnamed'}</p>
                    {contact.phoneNumber && (
                      <p className="text-sm text-gray-600 mt-0.5">{contact.phoneNumber}</p>
                    )}
                    
                    {/* Assigned To */}
                    <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-sm text-green-800">
                        👤 Assigned to: <span className="font-medium">{contact.assignedTo?.name || 'Unknown'}</span>
                      </p>
                      {contact.assignedTo?.email && (
                        <p className="text-xs text-green-600">{contact.assignedTo.email}</p>
                      )}
                    </div>
                    
                    {/* Assignment Info */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {contact.assignedAt && (
                        <span>Assigned: {new Date(contact.assignedAt).toLocaleDateString()}</span>
                      )}
                      {contact.assignmentStatus && (
                        <span className={`px-2 py-0.5 rounded-full ${
                          contact.assignmentStatus === 'COMPLETED' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {contact.assignmentStatus === 'COMPLETED' ? '✓ Completed' : 'Active'}
                        </span>
                      )}
                      {contact.completedAt && (
                        <span>Completed: {new Date(contact.completedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    
                    {/* Delegation Note */}
                    {contact.delegationNote && (
                      <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        📝 {contact.delegationNote}
                      </p>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setSelectedContactId(contact.id);
                        setShowAssignModal(true);
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors whitespace-nowrap"
                    >
                      Reassign
                    </button>
                    <button
                      onClick={() => handleUnassign(contact.id)}
                      className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded font-medium transition-colors whitespace-nowrap"
                    >
                      Take Away
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Assign Modal */}
        {selectedContactId && (
          <AssignModal
            isOpen={showAssignModal}
            onClose={() => {
              setShowAssignModal(false);
              setSelectedContactId(null);
            }}
            contactId={selectedContactId}
            contactName={delegatedContacts.find((c) => c.id === selectedContactId)?.name || ''}
            contactPhone={delegatedContacts.find((c) => c.id === selectedContactId)?.phoneNumber || ''}
            onSuccess={handleAssignSuccess}
          />
        )}
      </div>
    );
  }

  // ============ AGENT VIEW - My Assignments ============
  return (
    <div className="space-y-4">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">Active</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.active}</div>
        </div>
        <div className="p-3 rounded border border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-semibold text-gray-900 mt-1">{stats.completed}</div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-900">
        📥 Contacts assigned to you by your manager
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('ACTIVE')}
          className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            tab === 'ACTIVE'
              ? 'border-blue-500 text-gray-900'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Active ({stats.active})
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

      {/* Assignments List */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 bg-gray-100 rounded animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-500 border border-gray-200 rounded bg-gray-50">
            <p className="text-sm">
              {tab === 'ACTIVE' ? 'No active assignments' : 'No completed assignments'}
            </p>
          </div>
        ) : (
          assignments.map((contact) => (
            <div
              key={contact.id}
              className="p-4 border border-gray-200 rounded hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{contact.name || 'Unnamed'}</p>
                  {contact.phoneNumber && (
                    <p className="text-xs text-gray-600 mt-0.5">{contact.phoneNumber}</p>
                  )}
                  {contact.delegationNote && (
                    <p className="text-xs text-gray-700 mt-2 bg-gray-50 p-2 rounded line-clamp-2">📝 {contact.delegationNote}</p>
                  )}
                  {contact.assignedAt && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                      <span>Assigned: {new Date(contact.assignedAt).toLocaleDateString()}</span>
                      {contact.assignedBy && <span>• by {contact.assignedBy.name}</span>}
                    </div>
                  )}
                </div>
                {tab === 'ACTIVE' && (
                  <button
                    onClick={() => handleComplete(contact.id)}
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
    </div>
  );
}
