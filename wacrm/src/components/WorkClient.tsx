'use client';

import { useState, useEffect, useCallback } from 'react';
import MyAssignmentsTab from './work/MyAssignmentsTab';
import TasksTab from './work/TasksTab';
import FollowupsTab from './work/FollowupsTab';
import type { UserType } from '@/types';

interface Workspace {
  id: string;
  businessName: string;
}

interface TabCounts {
  assignments: number;
  tasks: number;
  followups: number;
}

export default function WorkClient({ user, workspace }: { user: UserType | null | undefined; workspace: Workspace }) {
  const [activeTab, setActiveTab] = useState<'assignments' | 'tasks' | 'followups'>('assignments');
  const [counts, setCounts] = useState<TabCounts>({ assignments: 0, tasks: 0, followups: 0 });
  const [refreshKey, setRefreshKey] = useState(0);

  // Function to refresh counts - can be called by child components
  const refreshCounts = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch assignment count (active assignments for this user)
      const assignmentsRes = await fetch('/api/contacts/my-work?status=ACTIVE', { credentials: 'include' });
      const assignmentsData = await assignmentsRes.json();
      
      // Fetch pending tasks count
      const tasksRes = await fetch('/api/tasks?status=TODO', { credentials: 'include' });
      const tasksData = await tasksRes.json();
      
      // Fetch pending follow-ups count (not done)
      const followupsRes = await fetch('/api/followups?isDone=false', { credentials: 'include' });
      const followupsData = await followupsRes.json();

      setCounts({
        assignments: assignmentsData.stats?.active || assignmentsData.assignments?.length || 0,
        tasks: tasksData.tasks?.length || 0,
        followups: followupsData.followUps?.length || 0,
      });
    } catch (error) {
      console.error('Failed to fetch work counts:', error);
    }
  }, [user]);

  // Fetch counts on mount and periodically
  useEffect(() => {
    if (!user) return;

    refreshCounts();
    // Refresh every 30 seconds
    const interval = setInterval(refreshCounts, 30000);
    return () => clearInterval(interval);
  }, [user, refreshCounts, refreshKey]);

  // Handler for when child components complete an action
  const handleItemCompleted = useCallback(() => {
    // Refresh counts immediately
    refreshCounts();
    // Also trigger a key change to force refresh in child if needed
    setRefreshKey(k => k + 1);
  }, [refreshCounts]);

  if (!user) return <div className="text-gray-500 p-4">User data not loaded</div>;

  const tabs = [
    { id: 'assignments', label: 'Assignments', count: counts.assignments },
    { id: 'tasks', label: 'Tasks', count: counts.tasks },
    { id: 'followups', label: 'Follow-ups', count: counts.followups },
  ] as const;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">My Work</h1>
        <p className="text-sm text-gray-600 mt-1">Manage assignments, tasks, and follow-ups</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-green-500 text-gray-900'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                activeTab === tab.id
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'assignments' && (
          <MyAssignmentsTab 
            user={user} 
            workspace={workspace} 
            onItemCompleted={handleItemCompleted}
          />
        )}
        {activeTab === 'tasks' && (
          <TasksTab 
            user={user} 
            workspace={workspace}
            onItemCompleted={handleItemCompleted}
          />
        )}
        {activeTab === 'followups' && (
          <FollowupsTab 
            user={user} 
            workspace={workspace}
            onItemCompleted={handleItemCompleted}
          />
        )}
      </div>
    </div>
  );
}
