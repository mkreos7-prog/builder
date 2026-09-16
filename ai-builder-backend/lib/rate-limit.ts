// In-memory rate limiter for Sprint 0
// NOTE: This is NOT distributed and will reset on server restart
// For production, move to Redis with sliding window implementation

interface RateLimitEntry {
  requests: number[];
}

const store = new Map<string, RateLimitEntry>();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS = 60;

function cleanupExpiredRequests(entry: RateLimitEntry, now: number): void {
  const cutoff = now - WINDOW_MS;
  entry.requests = entry.requests.filter((timestamp) => timestamp > cutoff);
}

export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let entry = store.get(userId);

  if (!entry) {
    entry = { requests: [] };
    store.set(userId, entry);
  }

  cleanupExpiredRequests(entry, now);

  const allowed = entry.requests.length < MAX_REQUESTS;
  const remaining = Math.max(0, MAX_REQUESTS - entry.requests.length);
  const oldestRequest = entry.requests[0] || now;
  const resetAt = oldestRequest + WINDOW_MS;

  if (allowed) {
    entry.requests.push(now);
  }

  return { allowed, remaining, resetAt };
}
