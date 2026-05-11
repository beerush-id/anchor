import type { TRec } from './types.js';

/**
 * Parses a URL search string into a query object.
 *
 * Handles duplicate keys by converting them to arrays.
 * Empty or missing search strings return an empty object.
 *
 * @param search - The URL search string (e.g., `?foo=bar&baz=qux`)
 * @returns A record of query parameters, with arrays for duplicate keys
 */
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
