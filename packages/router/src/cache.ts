import type { CachedMatch } from './types.js';

export function isCacheExpired(cached: CachedMatch, maxAge: number | undefined): boolean {
  if (!maxAge) return false;
  return Date.now() - cached.timestamp > maxAge;
}

export function enforceCacheLimit(cache: Map<string, CachedMatch>, limit: number): void {
  if (cache.size <= limit) return;

  const entries = Array.from(cache.entries());
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

  const toRemove = entries.slice(0, cache.size - limit);
  for (const [key] of toRemove) {
    cache.delete(key);
  }
}
