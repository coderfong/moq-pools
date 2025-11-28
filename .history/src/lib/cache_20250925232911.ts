// Simple in-memory TTL LRU cache for server runtime
// Note: This is per-process and resets on deployment/restart. For production,
// consider Redis or an external cache for consistency across instances.

export interface CacheEntry<V> {
  value: V;
  expiresAt: number; // epoch ms
}

export class TTLCache<K, V> {
  private store = new Map<K, CacheEntry<V>>();
  constructor(private maxSize = 100, private defaultTtlMs = 10 * 60 * 1000) {}

  get(key: K): V | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // LRU bump
    this.store.delete(key);
    this.store.set(key, hit);
    return hit.value;
  }

  set(key: K, value: V, ttlMs?: number) {
    const entry: CacheEntry<V> = { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) };
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, entry);
    if (this.store.size > this.maxSize) {
      // Evict least recently used (first entry)
      const firstKey = this.store.keys().next().value as K | undefined;
      if (firstKey !== undefined) this.store.delete(firstKey);
    }
  }

  delete(key: K) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

// Shared global instance for this process. Safe across hot reloads if module cache is preserved.
const globalAny = global as any;
if (!globalAny.__ttlCache) {
  globalAny.__ttlCache = new TTLCache<string, unknown>(100, 10 * 60 * 1000);
}

export const sharedCache: TTLCache<string, unknown> = globalAny.__ttlCache as TTLCache<string, unknown>;
