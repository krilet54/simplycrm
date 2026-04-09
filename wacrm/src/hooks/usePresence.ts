// src/hooks/usePresence.ts
// DISABLED - This feature exhausted the Upstash free tier (1M reads/month)
// The SCAN command for presence tracking was too expensive
// Do not re-enable without upgrading Upstash plan

'use client';

/**
 * usePresence hook - DISABLED
 * Returns empty/default values without making any API calls
 */
export function usePresence() {
  return {
    onlineUsers: {},
    isConnected: false,
    onlineCount: 0,
    isUserOnline: () => false,
    refreshPresence: () => {},
  };
}
