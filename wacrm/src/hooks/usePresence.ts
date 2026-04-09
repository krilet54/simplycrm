// src/hooks/usePresence.ts
// DISABLED - This feature exhausted the Upstash free tier (1M reads/month)
// The SCAN command for presence tracking was too expensive
// Do not re-enable without upgrading Upstash plan

'use client';

/**
 * usePresence hook - DISABLED
 * Returns empty/default values without making any API calls
 */
export interface PresenceUser {
  name: string;
  avatarUrl?: string | null;
  currentPage?: string | null;
}

interface UsePresenceResult {
  onlineUsers: Record<string, PresenceUser>;
  isConnected: boolean;
  onlineCount: number;
  isUserOnline: (userId: string) => boolean;
  refreshPresence: () => void;
}

export function usePresence(): UsePresenceResult {
  return {
    onlineUsers: {},
    isConnected: false,
    onlineCount: 0,
    isUserOnline: (_userId: string) => false,
    refreshPresence: () => {},
  };
}
