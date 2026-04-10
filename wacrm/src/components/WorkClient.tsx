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
  const [mountedTabs, setMountedTabs] = useState<Record<'assignments' | 'tasks' | 'followups', boolean>>({
    assignments: true,
    tasks: false,
    followups: false,
  });

  // Function to refresh counts - can be called by child components
  const refreshCounts = useCallback(async () => {
    if (!user) return;

    try {
      const assignmentsQuery = (user.role === 'OWNER' || user.role === 'ADMIN')
        ? '/api/contacts/my-work?action=delegated&countOnly=true'
        : '/api/contacts/my-work?status=ACTIVE&countOnly=true';

      const [assignmentsRes, tasksRes, followupsRes] = await Promise.all([
        fetch(assignmentsQuery, { credentials: 'include' }),
        fetch(`/api/tasks?status=TODO&userRole=${user.role}&countOnly=true`, { credentials: 'include' }),
        fetch('/api/followups?isDone=false&countOnly=true', { credentials: 'include' }),
      ]);

      const [assignmentsData, tasksData, followupsData] = await Promise.all([
        assignmentsRes.ok ? assignmentsRes.json() : Promise.resolve({}),
        tasksRes.ok ? tasksRes.json() : Promise.resolve({}),
        followupsRes.ok ? followupsRes.json() : Promise.resolve({}),
      ]);

      setCounts({
        assignments: assignmentsData.count ?? assignmentsData.stats?.active ?? assignmentsData.assignments?.length ?? 0,
        tasks: tasksData.count ?? tasksData.tasks?.length ?? 0,
        followups: followupsData.count ?? followupsData.followUps?.length ?? 0,
      });
    } catch (error) {
      console.error('Failed to fetch work counts:', error);
    }
  }, [user]);

  // Fetch counts on mount and periodically
  useEffect(() => {
    if (!user) return;

    refreshCounts();
    const warmTasks = window.setTimeout(() => {
      setMountedTabs((prev) => ({ ...prev, tasks: true }));
    }, 120);
    const warmFollowups = window.setTimeout(() => {
      setMountedTabs((prev) => ({ ...prev, followups: true }));
    }, 260);

    const interval = setInterval(refreshCounts, 60000);
    return () => {
      clearInterval(interval);
      window.clearTimeout(warmTasks);
      window.clearTimeout(warmFollowups);
    };
  }, [user, refreshCounts]);

  // Handler for when child components complete an action
  const handleItemCompleted = useCallback(() => {
    // Refresh counts immediately
    refreshCounts();
  }, [refreshCounts]);

  const handleTabChange = useCallback((tab: 'assignments' | 'tasks' | 'followups') => {
    setActiveTab(tab);
    setMountedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  }, []);

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
            onClick={() => handleTabChange(tab.id)}
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
        <div className={activeTab === 'assignments' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'assignments'}>
          <MyAssignmentsTab 
            user={user} 
            workspace={workspace} 
            onItemCompleted={handleItemCompleted}
          />
        </div>
        {mountedTabs.tasks && (
          <div className={activeTab === 'tasks' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'tasks'}>
          <TasksTab 
            user={user} 
            workspace={workspace}
            onItemCompleted={handleItemCompleted}
          />
          </div>
        )}
        {mountedTabs.followups && (
          <div className={activeTab === 'followups' ? 'block' : 'hidden'} aria-hidden={activeTab !== 'followups'}>
          <FollowupsTab 
            user={user} 
            workspace={workspace}
            onItemCompleted={handleItemCompleted}
          />
          </div>
        )}
      </div>
    </div>
  );
}
