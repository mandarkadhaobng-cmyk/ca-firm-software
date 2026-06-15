/**
 * Lightweight in-memory TTL cache to reduce redundant Supabase calls.
 * Survives page re-renders but is cleared on full page refresh.
 */
const store = new Map();

export const cache = {
  set(key, data, ttlSeconds = 60) {
    store.set(key, { data, expires: Date.now() + ttlSeconds * 1000 });
  },

  get(key) {
    const item = store.get(key);
    if (!item) return null;
    if (Date.now() > item.expires) {
      store.delete(key);
      return null;
    }
    return item.data;
  },

  /** Fetch from cache or run fn, then cache the result. */
  async wrap(key, fn, ttlSeconds = 60) {
    const cached = cache.get(key);
    if (cached !== null) return cached;
    const data = await fn();
    cache.set(key, data, ttlSeconds);
    return data;
  },

  /** Invalidate a single key or all keys with a given prefix. */
  invalidate(keyOrPrefix) {
    for (const k of store.keys()) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        store.delete(k);
      }
    }
  },

  clear() {
    store.clear();
  },
};
