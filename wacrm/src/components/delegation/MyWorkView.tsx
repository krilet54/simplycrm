"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AssignmentCard } from "./AssignmentCard";

interface Contact {
  id: string;
  name?: string;
  phoneNumber: string;
  interest?: string;
  delegationNote?: string;
  kanbanStage?: { name: string; color: string };
  assignedAt?: Date;
  assignedBy?: { name: string };
  assignmentStatus: string;
}

export function MyWorkView() {
  const router = useRouter();
  const [activeAssignments, setActiveAssignments] = useState<Contact[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ active: 0, completed: 0 });
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      // Fetch active
      const activeRes = await fetch("/api/contacts/my-work?status=ACTIVE");
      if (!activeRes.ok) throw new Error("Failed to fetch active assignments");
      const activeData = await activeRes.json();
      setActiveAssignments(activeData.assignments || []);
      setStats(activeData.stats || { active: 0, completed: 0 });

      // Fetch completed
      const completedRes = await fetch("/api/contacts/my-work?status=COMPLETED");
      if (!completedRes.ok) throw new Error("Failed to fetch completed assignments");
      const completedData = await completedRes.json();
      setCompletedAssignments(completedData.assignments || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error("Could not load your assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (contactId: string) => {
    setCompletingId(contactId);
    try {
      const res = await fetch(`/api/contacts/assignments/${contactId}/complete`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to complete assignment");

      toast.success("Assignment marked as complete");

      await fetchAssignments();
    } catch (error) {
      console.error("Error completing assignment:", error);
      toast.error("Could not complete assignment");
    } finally {
      setCompletingId(null);
    }
  };

  const handleOpenContact = (contactId: string) => {
    router.push(`/dashboard/contacts?contact=${contactId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-gray-900 rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-4 font-medium transition-colors ${
            activeTab === "active"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Assigned to me
          {stats.active > 0 && (
            <span className="ml-2 inline-block bg-red-100 text-red-700 text-xs font-medium px-2 py-1 rounded-full">
              {stats.active}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`pb-4 font-medium transition-colors ${
            activeTab === "completed"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Completed
          {stats.completed > 0 && (
            <span className="ml-2 inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
              {stats.completed}
            </span>
          )}
        </button>
      </div>

      {/* Active Tab */}
      {activeTab === "active" && (
        <>
          {activeAssignments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 font-medium">No active assignments yet</p>
              <p className="text-sm text-gray-400 mt-1">When someone assigns you a contact, it will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeAssignments.map((contact) => (
                <AssignmentCard
                  key={contact.id}
                  contact={contact}
                  onOpen={handleOpenContact}
                  onComplete={handleComplete}
                  isCompleting={completingId === contact.id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Completed Tab */}
      {activeTab === "completed" && (
        <>
          {completedAssignments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 font-medium">No completed assignments yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {completedAssignments.map((contact) => (
                <div
                  key={contact.id}
                  className="bg-green-50 border border-green-200 rounded-lg p-4 opacity-75"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-slate-900 truncate flex-1">
                      {contact.name || contact.phoneNumber}
                    </h3>
                    <span className="text-xs font-medium px-2 py-1 bg-green-200 text-green-800 rounded">
                      ✓ Complete
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{contact.phoneNumber}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
