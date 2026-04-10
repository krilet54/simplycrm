// src/lib/api-cache.ts
// Cache control utilities for API responses

export type CacheStrategy = 'short' | 'medium' | 'long' | 'no-cache';

const cacheConfig: Record<CacheStrategy, string> = {
  short: 'public, s-maxage=30, stale-while-revalidate=60', // 30s server, 60s stale
  medium: 'public, s-maxage=60, stale-while-revalidate=300', // 60s server, 5min stale
  long: 'public, s-maxage=300, stale-while-revalidate=600', // 5min server, 10min stale
  'no-cache': 'private, no-cache, no-store, must-revalidate', // No caching
};

export function getCacheHeaders(strategy: CacheStrategy = 'no-cache') {
  return {
    'Cache-Control': cacheConfig[strategy],
    'CDN-Cache-Control': cacheConfig[strategy],
  };
}

/**
 * Create a cached JSON response
 * Use this for API endpoints that can benefit from caching
 */
export function jsonResponse<T>(
  data: T,
  status = 200,
  cacheStrategy: CacheStrategy = 'no-cache'
) {
  const headers = {
    'Content-Type': 'application/json',
    ...getCacheHeaders(cacheStrategy),
  };

  return new Response(JSON.stringify(data), {
    status,
    headers,
  });
}

export function cachedJsonResponse<T>(
  data: T,
  status = 200,
  strategy: CacheStrategy = 'short'
) {
  return jsonResponse(data, status, strategy);
}
