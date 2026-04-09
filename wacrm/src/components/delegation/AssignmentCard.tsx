"use client";

import { formatDistanceToNow } from "date-fns";

interface AssignmentCardProps {
  contact: {
    id: string;
    name?: string;
    phoneNumber: string;
    interest?: string;
    delegationNote?: string;
    kanbanStage?: { name: string; color: string };
    assignedAt?: Date;
    assignedBy?: { name: string };
  };
  onOpen: (contactId: string) => void;
  onComplete: (contactId: string) => void;
  isCompleting?: boolean;
}

export function AssignmentCard({
  contact,
  onOpen,
  onComplete,
  isCompleting = false,
}: AssignmentCardProps) {
  const contactDisplay = contact.name || contact.phoneNumber;
  const stageName = contact.kanbanStage?.name || "Unassigned";
  const timeAgo = contact.assignedAt ? formatDistanceToNow(new Date(contact.assignedAt), { addSuffix: true }) : "Recently";

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
      {/* Contact Info Row */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-slate-900 truncate flex-1">{contactDisplay}</h3>
        <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded whitespace-nowrap ml-2">
          {stageName}
        </span>
      </div>

      {/* Phone Number */}
      <p className="text-sm text-slate-500 mb-3">{contact.phoneNumber}</p>

      {/* Delegation Note */}
      {contact.delegationNote && (
        <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-3 rounded">
          <p className="text-sm text-slate-700 italic">"{contact.delegationNote}"</p>
        </div>
      )}

      {/* Meta Info */}
      <div className="text-xs text-slate-500 mb-3 space-y-1">
        {contact.assignedBy && (
          <p>Assigned by <span className="font-medium text-slate-700">{contact.assignedBy.name}</span></p>
        )}
        <p>{timeAgo}</p>
      </div>

      {/* Interest/Value */}
      {contact.interest && (
        <div className="text-sm text-slate-600 mb-3 pb-3 border-b">
          <span className="font-medium">Interest:</span> {contact.interest}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onOpen(contact.id)}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Open contact
        </button>
        <button
          onClick={() => onComplete(contact.id)}
          disabled={isCompleting}
          className="px-3 py-2 text-gray-700 border border-gray-300 hover:bg-green-50 hover:text-green-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          ✓
        </button>
      </div>
    </div>
  );
}
