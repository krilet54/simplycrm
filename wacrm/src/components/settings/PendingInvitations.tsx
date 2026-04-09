'use client';

import { Copy, Trash2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  expiresAt: string;
  inviteLink: string;
}

interface Props {
  invitations: PendingInvitation[];
  isLoading: boolean;
  onRefresh: () => void;
  currentUserRole: string;
}

export default function PendingInvitations({
  invitations,
  isLoading,
  onRefresh,
  currentUserRole,
}: Props) {
  const canManage = ['OWNER', 'ADMIN'].includes(currentUserRole);

  if (!canManage) return null;

  const copyToClipboard = (text: string, email: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Invite link copied for ${email}`);
  };

  const revokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invitation?')) return;
    try {
      const res = await fetch(`/api/workspace/invite?id=${inviteId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke invitation');
      }
      toast.success('Invitation revoked');
      onRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to revoke invitation';
      toast.error(message);
      console.error('Revoke error:', error);
    }
  };

  if (invitations.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 border-t border-gray-200 pt-8">
      <h3 className="font-semibold text-sm text-gray-800 mb-4">
        🔗 Pending Invitations ({invitations.length})
      </h3>

      <div className="space-y-3">
        {invitations.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="font-medium text-gray-900">{invite.email}</p>
                <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded capitalize font-medium">
                  {invite.role.toLowerCase()}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Sent: {format(new Date(invite.createdAt), 'MMM d, yyyy')}
                </div>
                <div className="flex items-center gap-1">
                  ⏱️ Expires: {format(new Date(invite.expiresAt), 'MMM d, yyyy')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => copyToClipboard(invite.inviteLink, invite.email)}
                className="p-2 hover:bg-blue-200 rounded transition-colors"
                title="Copy invite link"
              >
                <Copy className="w-4 h-4 text-blue-600" />
              </button>
              <button
                onClick={() => revokeInvite(invite.id)}
                className="p-2 hover:bg-red-200 rounded transition-colors"
                title="Revoke invitation"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-600 mt-4 p-3 bg-gray-50 rounded border border-gray-200">
        💡 <strong>Tip:</strong> Share the invite link with team members via email, chat, or any other communication channel. They can click the link anytime within the next 7 days to join.
      </p>
    </div>
  );
}
