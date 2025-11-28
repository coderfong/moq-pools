// Simple in-memory SSE hub for per-user event streams (Node runtime only)
// Not suitable for multi-instance without external pub/sub; good for dev or single process.

export type UserEvent = {
  type: string;
  data?: any;
};

const subscribers = new Map<string, Set<(ev: UserEvent) => void>>();

export function publishToUser(userId: string, ev: UserEvent) {
  const set = subscribers.get(userId);
  if (!set || set.size === 0) return;
  for (const fn of Array.from(set)) {
    try { fn(ev); } catch {}
  }
}

export function subscribeUser(userId: string, onEvent: (ev: UserEvent) => void): () => void {
  let set = subscribers.get(userId);
  if (!set) {
    set = new Set();
    subscribers.set(userId, set);
  }
  set.add(onEvent);
  return () => {
    const s = subscribers.get(userId);
    if (!s) return;
    s.delete(onEvent);
    if (s.size === 0) subscribers.delete(userId);
  };
}
