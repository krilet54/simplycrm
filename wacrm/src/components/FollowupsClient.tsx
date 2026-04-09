'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistance, isToday, isYesterday, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { MyWorkView } from '@/components/delegation/MyWorkView';

interface FollowupsClientProps {
  activeFollowUps: any[];
  completedFollowUps: any[];
  activeTasks: any[];
  completedTasks: any[];
  contacts: any[];
  agents: any[];
  currentUser: any;
}

type Tab = 'followups' | 'tasks' | 'mywork';

export default function FollowupsClient({
  activeFollowUps,
  completedFollowUps,
  activeTasks,
  completedTasks,
  contacts,
  agents,
  currentUser,
}: FollowupsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('followups');
  const [showAddFollowup, setShowAddFollowup] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Categorize follow-ups
  const overdue = activeFollowUps.filter(fu => new Date(fu.dueDate) < today);
  const dueToday = activeFollowUps.filter(fu => {
    const fuDate = new Date(fu.dueDate);
    fuDate.setHours(0, 0, 0, 0);
    const todayDate = new Date(today);
    return fuDate.getTime() === todayDate.getTime();
  });
  const upcoming = activeFollowUps.filter(fu => new Date(fu.dueDate) > today);

  // Categorize tasks
  const taskOverdue = activeTasks.filter(t => t.dueDate && new Date(t.dueDate) < today);
  const taskDueToday = activeTasks.filter(t => {
    if (!t.dueDate) return false;
    const tDate = new Date(t.dueDate);
    tDate.setHours(0, 0, 0, 0);
    const todayDate = new Date(today);
    return tDate.getTime() === todayDate.getTime();
  });
  const taskOther = activeTasks.filter(t => !t.dueDate || new Date(t.dueDate) > today);

  const handleMarkFollowupDone = async (id: string) => {
    try {
      const res = await fetch(`/api/followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDone: true }),
      });
      if (res.ok) {
        toast.success('Follow-up marked done ✓');
        window.location.reload();
      }
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleTaskStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        if (newStatus === 'DONE') {
          toast.success('Task completed ✓');
        }
        window.location.reload();
      }
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const FollowUpCard = ({ fu }: { fu: any }) => (
    <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-gray-900">{fu.contact?.name || 'Unknown'}</p>
          {fu.contact?.kanbanStage && (
            <div className="inline-block mt-2">
              <span
                className="px-2 py-1 rounded text-xs font-medium text-white"
                style={{ backgroundColor: fu.contact.kanbanStage.color }}
              >
                {fu.contact.kanbanStage.name}
              </span>
            </div>
          )}
          {fu.note && <p className="text-sm text-gray-600 mt-2">{fu.note}</p>}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">
            {new Date(fu.dueDate) < today
              ? 'Overdue'
              : formatDistance(new Date(fu.dueDate), today, { addSuffix: false })}
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => handleMarkFollowupDone(fu.id)}
          className="flex-1 text-sm px-3 py-2 rounded bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
        >
          ✓ Done
        </button>
        <button
          onClick={() => router.push(`/dashboard/contacts?contactId=${fu.contactId}`)}
          className="flex-1 text-sm px-3 py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
        >
          Contact
        </button>
      </div>
    </div>
  );

  const TaskCard = ({ task }: { task: any }) => {
    const priorityColors: Record<string, string> = {
      HIGH: 'bg-red-100',
      MEDIUM: 'bg-yellow-100',
      LOW: 'bg-gray-100',
    };

    const statusIcons: Record<string, string> = {
      TODO: '○',
      IN_PROGRESS: '◐',
      DONE: '●',
    };

    return (
      <div className="bg-white rounded-lg p-4 border border-gray-100 hover:shadow-sm transition-shadow">
        <div className="flex items-start gap-3">
          <div className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${priorityColors[task.priority] || 'bg-gray-100'}`} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{task.title}</p>
            {task.assignedTo && (
              <div className="flex items-center gap-2 mt-2">
                {task.assignedTo.avatarUrl ? (
                  <img src={task.assignedTo.avatarUrl} alt={task.assignedTo.name} className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold">
                    {task.assignedTo.name.charAt(0)}
                  </div>
                )}
                <p className="text-xs text-gray-600">{task.assignedTo.name}</p>
              </div>
            )}
            {task.contact && (
              <p className="text-xs text-gray-600 mt-1">{task.contact.name}</p>
            )}
            {task.dueDate && (
              <p className="text-xs text-gray-600 mt-1">
                Due {new Date(task.dueDate) < today ? 'overdue' : formatDistance(new Date(task.dueDate), today)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <div className="flex gap-1">
            {(['TODO', 'IN_PROGRESS', 'DONE'] as const).map(status => (
              <button
                key={status}
                onClick={() => handleTaskStatusChange(task.id, status)}
                className={`w-8 h-8 rounded flex items-center justify-center text-lg transition-colors ${
                  task.status === status
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {statusIcons[status]}
              </button>
            ))}
          </div>
          <button className="flex-1 text-sm px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            Edit
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Follow-ups & Tasks</h1>
            <p className="text-gray-600 mt-1">
              {overdue.length + taskOverdue.length} overdue · {dueToday.length + taskDueToday.length} due today
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddFollowup(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              + Follow-up
            </button>
            <button
              onClick={() => setShowAddTask(true)}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
            >
              + Task
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('mywork')}
            className={`pb-4 font-medium transition-colors ${
              activeTab === 'mywork'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Work
          </button>
          <button
            onClick={() => setActiveTab('followups')}
            className={`pb-4 font-medium transition-colors ${
              activeTab === 'followups'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Follow-ups ({activeFollowUps.length})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-4 font-medium transition-colors ${
              activeTab === 'tasks'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tasks ({activeTasks.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'mywork' ? (
          <MyWorkView />
        ) : activeTab === 'followups' ? (
          <div className="space-y-6">
            {/* Overdue */}
            {overdue.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-red-600 mb-4">Overdue ({overdue.length})</h2>
                <div className="space-y-3">
                  {overdue.map(fu => (
                    <FollowUpCard key={fu.id} fu={fu} />
                  ))}
                </div>
              </div>
            )}

            {/* Due Today */}
            {dueToday.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-amber-600 mb-4">Due Today ({dueToday.length})</h2>
                <div className="space-y-3">
                  {dueToday.map(fu => (
                    <FollowUpCard key={fu.id} fu={fu} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-700 mb-4">Upcoming ({upcoming.length})</h2>
                <div className="space-y-3">
                  {upcoming.map(fu => (
                    <FollowUpCard key={fu.id} fu={fu} />
                  ))}
                </div>
              </div>
            )}

            {activeFollowUps.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 font-medium">You're all caught up! 🎉</p>
              </div>
            )}

            {/* Completed */}
            {completedFollowUps.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
                >
                  {showCompleted ? '▼' : '▶'} Show completed ({completedFollowUps.length})
                </button>
                {showCompleted && (
                  <div className="space-y-3 opacity-60">
                    {completedFollowUps.map(fu => (
                      <div key={fu.id} className="line-through">
                        <FollowUpCard fu={fu} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overdue Tasks */}
            {taskOverdue.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-red-600 mb-4">Overdue ({taskOverdue.length})</h2>
                <div className="space-y-3">
                  {taskOverdue.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Due Today Tasks */}
            {taskDueToday.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-amber-600 mb-4">Due Today ({taskDueToday.length})</h2>
                <div className="space-y-3">
                  {taskDueToday.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* All Tasks */}
            {taskOther.length > 0 && (
              <div>
                <h2 className="text-lg font-bold text-gray-700 mb-4">All Tasks ({taskOther.length})</h2>
                <div className="space-y-3">
                  {taskOther.map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {activeTasks.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600 font-medium">You're all caught up! 🎉</p>
              </div>
            )}

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-4"
                >
                  {showCompleted ? '▼' : '▶'} Show completed ({completedTasks.length})
                </button>
                {showCompleted && (
                  <div className="space-y-3 opacity-60">
                    {completedTasks.map(task => (
                      <div key={task.id} className="line-through">
                        <TaskCard task={task} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Follow-up Modal */}
      {showAddFollowup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Follow-up</h2>
            <p className="text-gray-600 text-sm mb-4">Follow-up feature coming soon. You can manage follow-ups directly from contacts.</p>
            <button
              onClick={() => setShowAddFollowup(false)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Add Task</h2>
            <p className="text-gray-600 text-sm mb-4">Task feature coming soon. You can manage tasks directly from contacts.</p>
            <button
              onClick={() => setShowAddTask(false)}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
