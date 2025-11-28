// Simple concurrency limiter to avoid spamming the image resolver.
const MAX = 6;
let active = 0;
const q: Array<() => void> = [];

export async function queued<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX) {
    await new Promise<void>((resolve) => q.push(resolve));
  }
  active++;
  try {
    return await fn();
  } finally {
    active--;
    const next = q.shift();
    if (next) next();
  }
}
