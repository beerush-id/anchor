import { describe, expect, it } from 'vitest';
import { createUrl } from '../src/url.js';

describe('createUrl', () => {
  it('should format URL with query parameters', () => {
    expect(createUrl('/users', undefined, { page: 1, limit: 10 })).toBe('/users?page=1&limit=10');
  });

  it('should remove trailing slash from URL path', () => {
    expect(createUrl('/users/', undefined)).toBe('/users');
    expect(createUrl('/', undefined)).toBe('/');
  });

  it('should handle URL with trailing slash and query params', () => {
    expect(createUrl('/users/', undefined, { page: 1 })).toBe('/users?page=1');
  });
});
