import { DEFAULT_CONFIG } from './constant.js';
import type { RouteSegment, TRec } from './types.js';

export function buildUrl(baseUrl: string, segments: RouteSegment[], params: TRec = {}, query: TRec = {}): URL {
  const pathName = segments
    .map((seg) => (seg.type === 'param' ? params[seg.name!] || `:${seg.name}` : seg.path))
    .join('/');
  const url = new URL(pathName, getBaseUrl(baseUrl));

  if (query) {
    Object.entries(query).forEach(([key, value]) => url.searchParams.append(key, JSON.stringify(value)));
  }

  return url;
}

export function getBaseUrl(baseUrl?: string) {
  if (baseUrl) return baseUrl;
  if (typeof location !== 'undefined') return location.origin;
  return DEFAULT_CONFIG.baseUrl;
}
