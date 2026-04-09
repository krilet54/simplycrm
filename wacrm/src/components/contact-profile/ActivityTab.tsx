'use client';

interface ActivityTabProps {
  activities: any[];
}

export default function ActivityTab({ activities }: ActivityTabProps) {
  if (activities.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">No activities yet</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {activities.map(activity => {
        const getActivityIcon = (type: string) => {
          const icons: Record<string, string> = {
            CONTACT_CREATED: '🆕',
            CALL: '📞',
            MESSAGE: '💬',
            EMAIL_SENT: '📧',
            INVOICE_SENT: '💰',
            NOTE_ADDED: '📝',
            STAGE_CHANGED: '🔄',
            TAG_ADDED: '🏷️',
            OTHER: '📌',
          };
          return icons[type] || '📌';
        };

        return (
          <div key={activity.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex gap-3">
              <div className="text-2xl flex-shrink-0">{getActivityIcon(activity.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{activity.type.replace(/_/g, ' ')}</p>
                <p className="text-sm text-gray-600 mt-1">{activity.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(activity.timestamp).toLocaleDateString()} at{' '}
                  {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
