"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
}

interface AssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactId: string;
  contactName: string;
  contactPhone: string;
  onSuccess: () => void;
}

export function AssignModal({
  isOpen,
  onClose,
  contactId,
  contactName,
  contactPhone,
  onSuccess,
}: AssignModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingTeam, setFetchingTeam] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen]);

  const fetchTeamMembers = async () => {
    setFetchingTeam(true);
    try {
      const res = await fetch("/api/contacts/team-members");
      if (!res.ok) throw new Error("Failed to fetch team members");
      const data = await res.json();
      setTeamMembers(data);
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Could not load team members");
    } finally {
      setFetchingTeam(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error("Please select a team member");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contacts/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          contactId,
          assignToId: selectedUserId,
          delegationNote: note || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || "Failed to assign contact");
      }

      toast.success("Contact assigned successfully");

      setSelectedUserId("");
      setNote("");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error assigning contact:", error);
      toast.error((error as Error).message || "Could not assign contact");
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = teamMembers.find((m) => m.id === selectedUserId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Assign Contact</h2>

        {/* Contact Summary */}
        <div className="bg-slate-50 p-3 rounded-lg mb-4">
          <p className="text-sm font-medium text-slate-700">{contactName || contactPhone}</p>
          <p className="text-xs text-slate-500 mt-1">{contactPhone}</p>
        </div>

        {/* Team Member Selection */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-900 block mb-2">Assign to</label>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {fetchingTeam ? (
              <p className="text-sm text-gray-500">Loading team members...</p>
            ) : teamMembers.length === 0 ? (
              <p className="text-sm text-gray-500">No team members available</p>
            ) : (
              teamMembers.map((member) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedUserId(member.id)}
                  className={`w-full p-2 rounded-lg border-2 text-left transition-all ${
                    selectedUserId === member.id
                      ? "border-green-500 bg-green-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {member.avatarUrl && (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{member.name}</p>
                      <p className="text-xs text-slate-500 truncate">{member.email}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Delegation Note */}
        {selectedMember && (
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-900 block mb-2">
              Add a note for {selectedMember.name} (optional)
            </label>
            <textarea
              placeholder="e.g., December catering, budget ₹45,000. Follow up Tuesday about menu preferences."
              value={note}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg p-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-2">
              This note will be sent in the assignment email and visible to {selectedMember.name}.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedUserId || loading}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            {loading ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}
