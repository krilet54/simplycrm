'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface Activity {
  id: string;
  activityType: string;
  title: string;
  description?: string;
  timestamp: string;
  actor?: { id: string; name: string };
}

interface ActivityTabProps {
  contactId: string;
}

export default function ActivityTab({ contactId }: ActivityTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!contactId) return;
    setLoading(true);
    fetch(`/api/contacts/${contactId}/activity`)
      .then((r) => r.json())
      .then((data) => setActivities(data.activities || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [contactId]);

  const activityIcons: Record<string, string> = {
    CONTACT_CREATED: '👤',
    MESSAGE_SENT: '💬',
    MESSAGE_RECEIVED: '📨',
    NOTE_ADDED: '📝',
    INVOICE_SENT: '📄',
    INVOICE_PAID: '✅',
    TAG_ADDED: '🏷️',
    EMAIL_SENT: '✉️',
    STAGE_CHANGED: '📊',
    CALL_LOGGED: '☎️',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-100">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Timeline</h4>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-xs text-gray-400 text-center">Loading...</p>}
        
        {!loading && activities.length === 0 && (
          <p className="text-xs text-gray-400 text-center">No activities yet.</p>
        )}

        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="border-l-2 border-forest-200 pl-3 py-1">
              <div className="flex items-start gap-2">
                <span className="text-base mt-0.5">{activityIcons[activity.activityType] || '•'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{activity.title}</p>
                  {activity.description && (
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{activity.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {activity.actor && (
                      <span className="text-xs text-gray-400">{activity.actor.name}</span>
                    )}
                    <span className="text-xs text-gray-300" suppressHydrationWarning>
                      {format(new Date(activity.timestamp), 'dd MMM, HH:mm')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
