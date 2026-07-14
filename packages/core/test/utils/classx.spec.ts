import { describe, expect, it } from 'vitest';
import { classx } from '../../src/index.js';
import { isValueGetter } from '../../src/module.js';

describe('classx', () => {
  it('should join multiple string classes', () => {
    expect(classx('foo', 'bar', 'baz').value).toBe('foo bar baz');
    expect(isValueGetter<string>(classx('foo'))).toBe(true);
  });

  it('should ignore falsy values', () => {
    expect(classx('foo', null, undefined, '', false, 'bar').value).toBe('foo bar');
  });

  it('should handle numbers', () => {
    expect(classx('foo', 1, 0, 'bar').value).toBe('foo 1 0 bar');
  });

  it('should handle array of classes', () => {
    expect(classx(['foo', 'bar'], 'baz').value).toBe('foo bar baz');
  });

  it('should handle nested arrays', () => {
    expect(classx(['foo', ['bar', 'baz']], 'qux').value).toBe('foo bar baz qux');
  });

  it('should handle object maps', () => {
    expect(classx({ foo: true, bar: false, baz: true }).value).toBe('foo baz');
  });

  it('should handle function providers', () => {
    expect(
      classx(
        () => 'foo',
        () => ['bar', 'baz'],
        () => ({ qux: true })
      ).value
    ).toBe('foo bar baz qux');
  });

  it('should handle complex mixed inputs', () => {
    expect(classx('a', ['b', { c: true, d: false }], () => 'e', null).value).toBe('a b c e');
  });

  it('should return empty string for no valid inputs', () => {
    expect(classx().value).toBe('');
    expect(classx(null, undefined, false, '').value).toBe('');
    expect(classx([]).value).toBe('');
    expect(classx({}).value).toBe('');
  });
});
