// In-memory token bucket rate limiter (per-process)
// Not suitable for multi-instance horizontal scale without external store.
// Usage: const lim = getRateLimiter('indiamart-detail', { capacity: 30, refillRate: 0.5 })
// if(!lim.tryRemoveTokens(1)) { /* reject 429 */ }

export interface RateLimiterOptions {
  capacity: number;          // Max tokens in bucket
  refillRate: number;        // Tokens added per second
  initialTokens?: number;    // Optional starting fill (default capacity)
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  constructor(private opts: RateLimiterOptions) {
    this.tokens = opts.initialTokens ?? opts.capacity;
    this.lastRefill = Date.now();
  }
  private refill() {
    const now = Date.now();
    const deltaSec = (now - this.lastRefill) / 1000;
    if (deltaSec <= 0) return;
    const add = deltaSec * this.opts.refillRate;
    if (add > 0) {
      this.tokens = Math.min(this.opts.capacity, this.tokens + add);
      this.lastRefill = now;
    }
  }
  tryRemoveTokens(n: number): boolean {
    this.refill();
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }
  get estimatedWaitMs(): number {
    this.refill();
    if (this.tokens >= 1) return 0;
    const deficit = 1 - this.tokens;
    return (deficit / this.opts.refillRate) * 1000;
  }
}

const globalAny = global as any;
if (!globalAny.__rateLimiters) globalAny.__rateLimiters = new Map<string, TokenBucket>();

export function getRateLimiter(key: string, opts: RateLimiterOptions): TokenBucket {
  const map: Map<string, TokenBucket> = globalAny.__rateLimiters;
  if (!map.has(key)) map.set(key, new TokenBucket(opts));
  return map.get(key)!;
}
