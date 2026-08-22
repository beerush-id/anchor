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

  it('should handle attach, detach, and clear sources', () => {
    const source1 = { data: { a: 1 } } as any;
    const source2 = { data: { b: 2 } } as any;

    context.attach(source1);
    expect(context.data.a).toBe(1);

    // Duplicate attach should be ignored
    context.attach(source1);

    // Detaching a non-attached source should do nothing
    context.detach(source2);
    expect(context.data.a).toBe(1);

    context.detach(source1);
    expect(context.data.a).toBeUndefined();

    context.attach(source1);
    context.clear();
    expect(context.data.a).toBeUndefined();
  });
});
