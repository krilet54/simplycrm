'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import type { ContactType } from '@/types';
import { AssignModal } from '@/components/delegation/AssignModal';

interface InfoTabProps {
  contact: ContactType;
  onContactUpdate?: (updated: ContactType) => void;
  currentUser?: { id: string; name: string; role?: string };
}

export default function InfoTab({ contact, onContactUpdate, currentUser }: InfoTabProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleAssignSuccess = async () => {
    // Refetch the contact data after assignment
    try {
      const res = await fetch(`/api/contacts/${contact.id}/details`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error(`Failed to refresh contact (${res.status})`);
      }
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('Failed to parse response JSON:', parseError);
        throw new Error(`Invalid response format: ${res.statusText || 'Unknown error'}`);
      }
      
      if (onContactUpdate && data.contact) {
        onContactUpdate(data.contact);
        toast.success('Assignment updated successfully!');
      } else {
        throw new Error('Contact data not found in response');
      }
    } catch (error) {
      console.error('Error refetching contact:', error);
      toast.error('Failed to refresh contact data after assignment');
    }
  };



  return (
    <div className="space-y-6 p-6">
      {/* Assignment - Only show for OWNER and ADMIN */}
      {(['OWNER', 'ADMIN'].includes(currentUser?.role || '')) && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Assign Contact</h3>
          <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">
                {contact.assignedTo ? (
                  <>
                    Assigned to <span className="font-medium text-gray-900">{contact.assignedTo.name}</span>
                    {contact.assignedAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        {contact.delegationNote && (
                          <p className="italic mt-2">"{contact.delegationNote}"</p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  'Not assigned to anyone yet'
                )}
              </p>
            </div>
            <button
              onClick={() => setShowAssignModal(true)}
              className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              {contact.assignedTo ? 'Reassign' : 'Assign to'}
            </button>
          </div>
        </div>
      )}

      <AssignModal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        contactId={contact.id}
        contactName={contact.name || ''}
        contactPhone={contact.phoneNumber}
        onSuccess={handleAssignSuccess}
      />

      {/* Basic Info */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-600">Phone</p>
            <p className="text-sm font-medium text-gray-900">{contact.phoneNumber}</p>
          </div>
          {contact.email && (
            <div>
              <p className="text-xs text-gray-600">Email</p>
              <p className="text-sm font-medium text-gray-900">{contact.email}</p>
            </div>
          )}
          {contact.source && (
            <div>
              <p className="text-xs text-gray-600">Source</p>
              <p className="text-sm font-medium text-gray-900">{contact.source}</p>
            </div>
          )}
          {contact.sourceNote && (
            <div>
              <p className="text-xs text-gray-600">Source Note</p>
              <p className="text-sm font-medium text-gray-900">{contact.sourceNote}</p>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline & Deal Info */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Pipeline & Deal</h3>
        <div className="space-y-3">
          {contact.kanbanStage && (
            <div>
              <p className="text-xs text-gray-600">Pipeline Stage</p>
              <div
                className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white mt-1"
                style={{ backgroundColor: contact.kanbanStage.color }}
              >
                {contact.kanbanStage.name}
              </div>
            </div>
          )}
          {contact.estimatedValue && (
            <div>
              <p className="text-xs text-gray-600">Deal Value</p>
              <p className="text-lg font-semibold text-green-600">₹{contact.estimatedValue.toLocaleString()}</p>
            </div>
          )}
          {contact.interest && (
            <div>
              <p className="text-xs text-gray-600">Interested In</p>
              <p className="text-sm font-medium text-gray-900">{contact.interest}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tags */}
      {contact.contactTags && contact.contactTags.length > 0 && (
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {contact.contactTags.map(ct => (
              <span
                key={ct.tagId}
                className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
              >
                {ct.tag?.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="border-t pt-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Timeline</h3>
        <div className="space-y-2 text-xs text-gray-600">
          {contact.lastActivityAt ? (
            <p>Last activity on {new Date(contact.lastActivityAt).toLocaleDateString()}</p>
          ) : (
            <p>No activity yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
