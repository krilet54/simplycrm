// src/lib/redis.ts
// Redis integration DISABLED to conserve Upstash free tier
// The presence tracking feature exhausted the monthly limit (1M reads)
// Re-enable when upgrading or next billing cycle

/**
 * Redis is currently DISABLED
 * All functions return immediately without making Redis calls
 */
export function getRedis(): null {
  return null;
}

export async function queueNotification(userId: string, notification: any): Promise<void> {
  // Disabled - notifications are stored in database instead
  return;
}
