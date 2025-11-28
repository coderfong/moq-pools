// Simple in-memory rate limiter (per-process). Suitable for low-volume and single-instance Node runtime.
// For multi-instance deployments, prefer Redis/Upstash or another centralized store.

type Window = { ts: number }[];
const buckets = new Map<string, Window>();

export function isRateLimited(key: string, limit: number, windowMs: number): { limited: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  const w = buckets.get(key) || [];
  // remove old
  const recent = w.filter((e) => e.ts > cutoff);
  recent.push({ ts: now });
  buckets.set(key, recent);
  const count = recent.length;
  const limited = count > limit;
  const remaining = Math.max(0, limit - (count - 1));
  return { limited, remaining };
}

export function rateLimitHeaders(limit: number, remaining: number, windowMs: number) {
  const reset = Math.ceil(windowMs / 1000);
  return {
    'x-rate-limit': String(limit),
    'x-rate-remaining': String(remaining),
    'x-rate-reset': String(reset),
  } as Record<string, string>;
}
