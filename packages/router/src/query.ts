import type { TRec } from './types.js';

export function parseQuery(search: string): TRec {
  const query: TRec = {};
  if (!search || search === '?') return query;

  const params = new URLSearchParams(search);

  for (const [key, value] of params) {
    if (key in query) {
      const existing = query[key];

      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        query[key] = [existing as string, value];
      }
    } else {
      query[key] = value;
    }
  }

  return query;
}
