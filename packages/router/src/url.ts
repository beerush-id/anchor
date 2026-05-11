/**
 * Constructs a URL string from a route path, parameters, and query parameters.
 *
 * This function replaces dynamic path segments (e.g., `:id`) with provided values
 * and appends a query string if query parameters are present. It handles both
 * single values and arrays for query parameters.
 *
 * @param path - The base route path (e.g., `/users/:id`)
 * @param params - Optional record of path parameters to replace dynamic segments
 * @param query - Optional record of query parameters to append to the URL
 * @returns The constructed URL string, ensuring it starts with a leading slash
 */
export function createUrl(path: string, params?: Record<string, unknown>, query?: Record<string, unknown>) {
  let url = path;

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, String(value));
    }
  }

  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  if (query && Object.keys(query).length > 0) {
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        (value as string[]).forEach((item) => searchParams.append(key, String(item)));
      } else {
        searchParams.set(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    url += (url.includes('?') ? '&' : '?') + queryString;
  }

  return url.startsWith('/') ? url : `/${url}`;
}
