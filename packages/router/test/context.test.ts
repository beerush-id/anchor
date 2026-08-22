import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/constant.js';
import { RouterContext } from '../src/context.js';

describe('RouterContext', () => {
  let context: RouterContext<any, any, any>;

  beforeEach(() => {
    context = new RouterContext();
  });

  it('should handle URL properties when url is not set', () => {
    expect(context.hash).toBeUndefined();
    expect(context.origin).toBe(DEFAULT_CONFIG.baseUrl);
    expect(context.search).toBe('');
    expect(context.pathname).toBe('');
    expect(context.fullPath).toBe('/');
  });

  it('should handle URL properties when url is set as string', () => {
    context.url = 'https://example.com/path/to/page?query=1#section';
    expect(context.hash).toBe('#section');
    expect(context.origin).toBe('https://example.com');
    expect(context.search).toBe('?query=1');
    expect(context.pathname).toBe('/path/to/page');
    expect(context.fullPath).toBe('/path/to/page?query=1');
  });

  it('should handle URL properties when url is set as URL object', () => {
    context.url = new URL('https://test.com/path?test=2#hash') as never;
    expect(context.hash).toBe('#hash');
    expect(context.origin).toBe('https://test.com');
    expect(context.search).toBe('?test=2');
    expect(context.pathname).toBe('/path');
    expect(context.fullPath).toBe('/path?test=2');
  });

  it('should handle setting url to undefined', () => {
    context.url = undefined;
    expect(context.url).toBeUndefined();
  });
});
