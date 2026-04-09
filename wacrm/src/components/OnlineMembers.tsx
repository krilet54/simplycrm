// src/components/OnlineMembers.tsx
'use client';

import { usePresence } from '@/hooks/usePresence';
import { Users } from 'lucide-react';

interface OnlineMembersProps {
  className?: string;
}

export function OnlineMembers({ className = '' }: OnlineMembersProps) {
  const { onlineUsers, onlineCount, isConnected } = usePresence();

  // Don't show if no one is online or not connected
  if (!isConnected || onlineCount === 0) {
    return null;
  }

  const users = Object.entries(onlineUsers).slice(0, 5); // Show max 5

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Online indicator */}
      <div className="flex items-center gap-1.5 text-sm text-gray-600">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        <span className="hidden sm:inline">{onlineCount} online</span>
      </div>

      {/* Avatar stack */}
      <div className="flex -space-x-2">
        {users.map(([userId, user]) => (
          <div
            key={userId}
            className="relative"
            title={`${user.name}${user.currentPage ? ` • ${user.currentPage}` : ''}`}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-7 h-7 rounded-full border-2 border-white object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium">
                {user.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            {/* Green online dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
          </div>
        ))}
        
        {/* Show +N if more users */}
        {onlineCount > 5 && (
          <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium">
            +{onlineCount - 5}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for sidebar
export function OnlineMembersCompact({ className = '' }: OnlineMembersProps) {
  const { onlineCount, isConnected } = usePresence();

  if (!isConnected) return null;

  return (
    <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
      <Users className="w-4 h-4" />
      <span>{onlineCount} online</span>
    </div>
  );
}
