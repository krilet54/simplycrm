import type { NextResponse } from 'next/server';

const SLOW_API_THRESHOLD_MS = 700;

export function withApiTiming<T extends Response | NextResponse>(
  response: T,
  label: string,
  startedAt: number
): T {
  const durationMs = Math.round((performance.now() - startedAt) * 10) / 10;
  response.headers.set('Server-Timing', `${label};dur=${durationMs}`);
  response.headers.set('X-Response-Time', `${durationMs}ms`);

  if (durationMs >= SLOW_API_THRESHOLD_MS) {
    console.warn(`[API Slow] ${label} took ${durationMs}ms`);
  }

  return response;
}
