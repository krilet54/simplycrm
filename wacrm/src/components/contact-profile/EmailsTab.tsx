'use client';

interface EmailsTabProps {
  emails: any[];
  onSendClick?: () => void;
}

export default function EmailsTab({ emails, onSendClick }: EmailsTabProps) {
  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      SENT: '✓',
      DRAFT: '✎',
      OPENED: '👁️',
    };
    return icons[status] || '?';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SENT: 'bg-blue-100 text-blue-700',
      DRAFT: 'bg-gray-100 text-gray-700',
      OPENED: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (emails.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600 mb-4">No emails yet</p>
        <button 
          onClick={onSendClick}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Send Email
        </button>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {emails.map(email => (
        <div key={email.id} className="p-6 hover:bg-gray-50 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{email.subject}</p>
              <p className="text-sm text-gray-600">To: {email.to}</p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(email.status)}`}>
              {email.status}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 line-clamp-2 mb-3">{email.body}</p>
          
          <div className="flex items-center justify-between text-xs text-gray-600">
            <p>{new Date(email.createdAt).toLocaleDateString()}</p>
            {email.sentAt && (
              <p>Sent: {new Date(email.sentAt).toLocaleDateString()}</p>
            )}
            {email.openedAt && (
              <p>Opened: {new Date(email.openedAt).toLocaleDateString()}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
