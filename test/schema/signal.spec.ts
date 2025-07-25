import { expect, test } from 'vitest';
import { signal } from '../../lib/esm/index.js';

test('validates new signal object for number', () => {
  const value = signal(1);

  expect(Array.isArray(value)).toBe(true);

  const [getter, setter, subscribe, destroy] = value;

  expect(typeof getter).toBe('function');
  expect(typeof getter.set).toBe('function');
  expect(typeof getter.subscribe).toBe('function');

  expect(typeof setter).toBe('function');
  expect(typeof subscribe).toBe('function');
  expect(typeof destroy).toBe('function');

  expect(getter()).toBe(1);

  setter(2);

  expect(getter()).toBe(2);
  expect(getter((v) => v + 1)).toBe(3);

  getter.set(4);
  expect(getter()).toBe(4);

  getter.subscribe((v) => {
    expect(v).toBe(4);
  });

  subscribe((v) => {
    expect(v).toBe(4);
  });

  destroy();
  expect(getter()).toBe(undefined);
});

test('validates new signal object for string', () => {
  const [getter, setter, subscribe, destroy] = signal('foo');

  expect(getter()).toBe('foo');

  setter('bar');

  expect(getter()).toBe('bar');
  expect(getter((v) => v + 'baz')).toBe('barbaz');

  getter.set('baz');

  expect(getter()).toBe('baz');

  getter.subscribe((v) => {
    expect(v).toBe('baz');
  });

  subscribe((v) => {
    expect(v).toBe('baz');
  });

  destroy();
  expect(getter()).toBe(undefined);
});

test('validates new signal object for boolean', () => {
  const [getter, setter, subscribe, destroy] = signal(true);

  expect(getter()).toBe(true);

  setter(false);

  expect(getter()).toBe(false);
  expect(getter((v) => !v)).toBe(true);

  getter.set(true);

  expect(getter()).toBe(true);

  getter.subscribe((v) => {
    expect(v).toBe(true);
  });

  subscribe((v) => {
    expect(v).toBe(true);
  });

  destroy();
  expect(getter()).toBe(undefined);
});

test('validates new signal object for object', () => {
  const [getter, setter, subscribe, destroy] = signal({ foo: 'bar' });

  expect(getter()).toEqual({ foo: 'bar' });

  setter({ foo: 'baz' });

  expect(getter()).toEqual({ foo: 'baz' });
  expect(getter((v) => ({ foo: 'fiz' }))).toEqual({ foo: 'fiz' });

  getter.set({ foo: 'quux' });

  expect(getter()).toEqual({ foo: 'quux' });

  getter.subscribe((v) => {
    expect(v).toEqual({ foo: 'quux' });
  });

  subscribe((v) => {
    expect(v).toEqual({ foo: 'quux' });
  });

  destroy();
  expect(getter()).toBe(undefined);
});

test('validates new signal object for array', () => {
  const [getter, setter, subscribe, destroy] = signal(['foo', 'bar']);

  expect(getter()).toEqual(['foo', 'bar']);

  setter(['foo', 'baz']);

  expect(getter()).toEqual(['foo', 'baz']);
  expect(getter((v) => ['foo', 'fiz'])).toEqual(['foo', 'fiz']);

  getter.set(['foo', 'quux']);

  expect(getter()).toEqual(['foo', 'quux']);

  getter.subscribe((v) => {
    expect(v).toEqual(['foo', 'quux']);
  });

  subscribe((v) => {
    expect(v).toEqual(['foo', 'quux']);
  });

  destroy();
  expect(getter()).toBe(undefined);
});
