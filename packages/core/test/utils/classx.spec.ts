import { describe, expect, it } from 'vitest';
import { classx, isValueGetter } from '../../src/index.js';

describe('classx', () => {
  it('should join multiple string classes', () => {
    expect(classx('foo', 'bar', 'baz')).toBe('foo bar baz');
    const getter = classx.use(() => 'foo');
    expect(isValueGetter<string>(getter)).toBe(true);
    expect(getter()).toBe('foo');
  });

  it('should ignore falsy values', () => {
    expect(classx('foo', null, undefined, '', false, 'bar')).toBe('foo bar');
  });

  it('should handle numbers', () => {
    expect(classx('foo', 1, 0, 'bar')).toBe('foo 1 0 bar');
  });

  it('should handle array of classes', () => {
    expect(classx(['foo', 'bar'], 'baz')).toBe('foo bar baz');
  });

  it('should handle nested arrays', () => {
    expect(classx(['foo', ['bar', 'baz']], 'qux')).toBe('foo bar baz qux');
  });

  it('should handle object maps', () => {
    expect(classx({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should handle function providers', () => {
    expect(
      classx(
        () => 'foo',
        () => ['bar', 'baz'],
        () => ({ qux: true })
      )
    ).toBe('foo bar baz qux');
  });

  it('should handle complex mixed inputs', () => {
    expect(classx('a', ['b', { c: true, d: false }], () => 'e', null)).toBe('a b c e');
  });

  it('should return empty string for no valid inputs', () => {
    expect(classx()).toBe('');
    expect(classx(null, undefined, false, '')).toBe('');
    expect(classx([])).toBe('');
    expect(classx({})).toBe('');
  });
});
