import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive, logger } from '@anchor/core';
import { z } from 'zod';

describe('Anchor Core', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(logger as never as typeof console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Read and Write', () => {
    it('should create an object', () => {
      const state = anchor({ count: 0 });
      expect(state.count).toBe(0);
    });

    it('should update object properties', () => {
      const state = anchor({ count: 0 });
      state.count = 1;
      expect(state.count).toBe(1);
    });

    it('should track multiple property updates', () => {
      const state = anchor({ x: 0, y: 0 });
      state.x = 1;
      state.y = 2;
      expect(state.x).toBe(1);
      expect(state.y).toBe(2);
    });

    it('should create an array', () => {
      const state = anchor([1, 2, 3]);
      expect(state.length).toBe(3);
      expect(state[0]).toBe(1);
    });

    it('should update array elements', () => {
      const state = anchor([1, 2, 3]);
      state[0] = 10;
      expect(state[0]).toBe(10);
    });

    it('should handle complex nested objects', () => {
      const state = anchor({
        user: {
          name: 'John',
          profile: {
            age: 30,
          },
        },
      });

      state.user.name = 'Jane';
      state.user.profile.age = 31;

      expect(state.user.name).toBe('Jane');
      expect(state.user.profile.age).toBe(31);
    });
  });

  describe('Array Methods', () => {
    it('should handle array push operation', () => {
      const state = anchor([1, 2]);
      const length = state.push(3);
      expect(length).toBe(3);
      expect(state.length).toBe(3);
      expect(state[2]).toBe(3);
    });

    it('should handle array pop operation', () => {
      const state = anchor([1, 2, 3]);
      const lastItem = state.pop();
      expect(lastItem).toBe(3);
      expect(state.length).toBe(2);
    });

    it('should handle array unshift operation', () => {
      const state = anchor([1, 2]);
      const length = state.unshift(0);
      expect(length).toBe(3);
      expect(state[0]).toBe(0);
      expect(state[1]).toBe(1);
    });

    it('should handle array shift operation', () => {
      const state = anchor([1, 2, 3]);
      const firstItem = state.shift();
      expect(firstItem).toBe(1);
      expect(state.length).toBe(2);
      expect(state[0]).toBe(2);
    });

    it('should handle array splice operation', () => {
      const state = anchor([1, 2, 3, 4, 5]);
      const removed = state.splice(2, 2, 6, 7);
      expect(removed).toEqual([3, 4]);
      expect(state).toEqual([1, 2, 6, 7, 5]);
    });

    it('should handle array sort operation', () => {
      const state = anchor([3, 1, 4, 1, 5]);
      state.sort();
      expect(state).toEqual([1, 1, 3, 4, 5]);
    });

    it('should handle array reverse operation', () => {
      const state = anchor([1, 2, 3, 4, 5]);
      state.reverse();
      expect(state).toEqual([5, 4, 3, 2, 1]);
    });

    it('should handle array fill operation', () => {
      const state = anchor([1, 2, 3, 4, 5]);
      state.fill(0, 1, 3);
      expect(state).toEqual([1, 0, 0, 4, 5]);
    });

    it('should handle array copyWithin operation', () => {
      const state = anchor([1, 2, 3, 4, 5]);
      state.copyWithin(0, 3, 4);
      expect(state).toEqual([4, 2, 3, 4, 5]);
    });
  });

  describe('Map Operations', () => {
    it('should handle Map set operations', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor({ map });

      // Test setting new key-value pair
      state.map.set('b', 2);
      expect(state.map.get('b')).toBe(2);

      // Test updating existing key
      state.map.set('a', 10);
      expect(state.map.get('a')).toBe(10);
      expect(state.map.size).toBe(2);
    });

    it('should handle Map delete operations', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor({ map });

      const result = state.map.delete('a');
      expect(result).toBe(true);
      expect(state.map.has('a')).toBe(false);
      expect(state.map.size).toBe(1);
    });

    it('should handle Map clear operations', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor({ map });

      state.map.clear();
      expect(state.map.size).toBe(0);
      expect(state.map.has('a')).toBe(false);
      expect(state.map.has('b')).toBe(false);
    });

    it('should handle Map forEach operations with reactive updates', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor({ map });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      const values: number[] = [];
      state.map.forEach((value) => values.push(value));
      expect(values).toEqual([1, 2]);

      // Update a value and check that forEach still works
      state.map.set('a', 10);
      expect(handler).toHaveBeenCalledTimes(2); // init + set

      unsubscribe();
    });
  });

  describe('Set Operations', () => {
    it('should handle Set add operations', () => {
      const set = new Set([1, 2]);
      const state = anchor({ set });

      // Add new value
      state.set.add(3);
      expect(state.set.has(3)).toBe(true);
      expect(state.set.size).toBe(3);

      // Try to add existing value (should not change size)
      state.set.add(1);
      expect(state.set.size).toBe(3);
    });

    it('should handle Set delete operations', () => {
      const set = new Set([1, 2, 3]);
      const state = anchor({ set });

      const result = state.set.delete(2);
      expect(result).toBe(true);
      expect(state.set.has(2)).toBe(false);
      expect(state.set.size).toBe(2);

      // Try to delete non-existing value
      const result2 = state.set.delete(10);
      expect(result2).toBe(false);
    });

    it('should handle Set clear operations', () => {
      const set = new Set([1, 2, 3]);
      const state = anchor({ set });

      state.set.clear();
      expect(state.set.size).toBe(0);
      expect(state.set.has(1)).toBe(false);
      expect(state.set.has(2)).toBe(false);
      expect(state.set.has(3)).toBe(false);
    });

    it('should handle Set forEach operations with reactive updates', () => {
      const set = new Set([1, 2]);
      const state = anchor({ set });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      const values: number[] = [];
      state.set.forEach((value) => values.push(value));
      expect(values).toEqual([1, 2]);

      // Add a value and check that forEach works with new values
      state.set.add(3);
      expect(handler).toHaveBeenCalledTimes(2); // init + add

      const newValues: number[] = [];
      state.set.forEach((value) => newValues.push(value));
      expect(newValues).toEqual([1, 2, 3]);

      unsubscribe();
    });

    it('should handle Set has operations', () => {
      const set = new Set([1, 2]);
      const state = anchor({ set });

      expect(state.set.has(1)).toBe(true);
      expect(state.set.has(3)).toBe(false);

      state.set.add(3);
      expect(state.set.has(3)).toBe(true);
    });
  });

  describe('Schema Validation', () => {
    it('should validate initial state with schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor({ name: 'John', age: 30 }, { schema });
      expect(state.name).toBe('John');
      expect(state.age).toBe(30);
    });

    it('should validate property updates with schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor({ name: 'John', age: 30 }, { schema, strict: true });

      // Valid update
      state.name = 'Jane';
      expect(state.name).toBe('Jane');

      // Invalid update should throw in strict mode
      expect(() => {
        state.age = 'invalid' as never;
      }).toThrow();
    });

    it('should validate array items with schema', () => {
      const schema = z.array(z.string());
      const state = anchor(['a', 'b'], { schema, strict: true });

      // Valid push
      state.push('c');
      expect(state).toEqual(['a', 'b', 'c']);

      // Invalid push should throw in strict mode
      expect(() => {
        state.push(123 as never);
      }).toThrow();
    });

    it('should validate initial nested properties', () => {
      const schema = z.object({
        id: z.number(),
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const state = anchor({ id: 1, user: { name: 'John', age: 30 }, tags: ['tag1', 'tag2'] }, { schema });

      expect(state.id).toBe(1);
      expect(state.user.name).toBe('John');
      expect(state.user.age).toBe(30);
      expect(state.tags).toEqual(['tag1', 'tag2']);
    });

    it('should validate nested property assignment', () => {
      const schema = z.object({
        id: z.number(),
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const state = anchor({ id: 1, user: { name: 'John', age: 30 }, tags: ['tag1', 'tag2'] }, { schema });

      state.id = 2;
      state.user.name = 'Jane';
      state.user.age = 31;
      state.tags.push('tag3');

      expect(state.id).toBe(2);
      expect(state.user.name).toBe('Jane');
      expect(state.user.age).toBe(31);
      expect(state.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should prevent invalid value assignment on nested properties', () => {
      const schema = z.object({
        id: z.number(),
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
        tags: z.array(z.string()),
      });

      const state = anchor({ id: 1, user: { name: 'John', age: 30 }, tags: ['tag1', 'tag2'] }, { schema });

      state.id = '1' as never;
      state.user.name = 123 as never;
      state.user.age = 'invalid' as never;
      state.tags.push(123 as never);

      expect(state.id).toBe(1);
      expect(state.user.name).toBe('John');
      expect(state.user.age).toBe(30);
      expect(state.tags).toEqual(['tag1', 'tag2']);
    });

    it('should log error instead of throwing when strict is false', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor({ name: 'John', age: 30 }, { schema, strict: false });

      // Reset mock to clear any previous calls
      consoleErrorSpy.mockClear();

      // Invalid update should not throw but log error
      state.age = 'invalid' as never;

      // Should still maintain the previous valid value
      expect(state.age).toBe(30);

      // Should have called console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should log error for array validation failures when strict is false', () => {
      const schema = z.array(z.string());
      const state = anchor(['a', 'b'], { schema, strict: false });

      // Reset mock to clear any previous calls
      consoleErrorSpy.mockClear();

      // Invalid push should not throw but log error
      state.push(123 as never);

      // Should still maintain the previous valid array
      expect(state).toEqual(['a', 'b']);

      // Should have called console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should throw for invalid assignment in strict mode', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const state = anchor({ name: 'John', age: 30 }, { schema, strict: true });

      expect(() => {
        state.name = 123 as never;
      }).toThrow();
      expect(() => {
        state.age = 'invalid' as never;
      }).toThrow();
      expect(() => {
        state.name = 'John Smith';
      }).not.toThrow();
      expect(state.name).toBe('John Smith');
    });
  });

  describe('Subscription', () => {
    it('should verify that the emitted value is not the state itself', () => {
      const state = anchor({ a: 1, b: 2 });
      const handler = vi.fn();

      let sameState = false;

      const unsubscribe = derive(state, (value, event) => {
        handler(value, event);

        if (event?.type !== 'init') {
          sameState = value === state;
        }
      });

      state.b = 10;

      expect(sameState).toBe(false);
      expect(handler).toHaveBeenCalledTimes(2); // init + set
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, { type: 'set', prev: 2, keys: ['b'], value: 10 });

      unsubscribe();
    });

    it('should notify subscribers of Object property changes', () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn();

      const unsubscribe = derive(state, handler);
      state.count = 1;

      expect(handler).toHaveBeenCalledTimes(2); // init + set
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, { type: 'set', prev: 0, keys: ['count'], value: 1 });

      unsubscribe();
    });

    it('should handle property deletion and notify subscribers', () => {
      const state = anchor({ a: 1, b: 2 });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      delete state.a;

      expect(state).toEqual({ b: 2 }); // Check final state
      expect(handler).toHaveBeenCalledTimes(2); // init + delete
      expect(handler).toHaveBeenNthCalledWith(2, state, { type: 'delete', prev: 1, keys: ['a'] });

      unsubscribe();
    });

    it('should notify subscribers of Array mutations', () => {
      const state = anchor([1, 2, 3]);
      const handler = vi.fn();

      const unsubscribe = derive(state, handler);
      state.push(4);

      expect(handler).toHaveBeenCalledTimes(2); // init + push
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, { type: 'push', prev: [1, 2, 3], keys: [], value: [4] });

      unsubscribe();
    });

    it('should notify subscribers of Map changes', () => {
      const map = new Map([['a', 1]]);
      const state = anchor({ map });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      state.map.set('b', 2);

      expect(handler).toHaveBeenCalledTimes(2); // init + set
      expect(handler).toHaveBeenNthCalledWith(2, state, {
        type: 'set',
        prev: undefined,
        keys: ['map', 'b'],
        value: 2,
      }); // assuming nested path
      expect(state.map.get('b')).toBe(2);

      unsubscribe();
    });

    it('should notify subscribers of Set changes', () => {
      const set = new Set([1, 2]);
      const state = anchor({ set });

      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      state.set.add(3);

      expect(handler).toHaveBeenCalledTimes(2); // init + set
      expect(handler).toHaveBeenNthCalledWith(2, state, { type: 'add', prev: undefined, keys: ['set'], value: 3 }); // assuming nested path
      expect(state.set.has(3)).toBe(true);

      unsubscribe();
    });

    it('should notify subscribers of Nested Array mutations', () => {
      const state = anchor({
        todos: [{ id: 1, title: 'foo', completed: false }],
      });

      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      state.todos[0].completed = true;
      state.todos.push({ id: 2, title: 'bar', completed: false });

      expect(handler).toHaveBeenCalledTimes(3); // init + set + push
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, {
        type: 'set',
        prev: false,
        keys: ['todos', '0', 'completed'],
        value: true,
      });
      expect(handler).toHaveBeenNthCalledWith(3, state, {
        type: 'push',
        prev: [{ id: 1, title: 'foo', completed: true }],
        keys: ['todos'],
        value: [{ id: 2, title: 'bar', completed: false }],
      });

      unsubscribe();
    });

    it('should properly unsubscribe', () => {
      const state = anchor({ count: 0 });
      const handler = vi.fn();

      const unsubscribe = derive(state, handler);
      unsubscribe();

      state.count = 1;
      expect(handler).toHaveBeenCalledTimes(1); // only init, no set
    });
  });

  describe('Flat Subscription', () => {
    it('should notify subscribers of flat array mutations', () => {
      const state = anchor(['a', 'b'], { recursive: 'flat' });
      const handler = vi.fn();

      const unsubscribe = derive(state, handler);
      state.push('c');

      expect(handler).toHaveBeenCalledTimes(2);
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, {
        type: 'push',
        keys: [],
        prev: ['a', 'b'],
        value: ['c'],
      });
      expect(state).toEqual(['a', 'b', 'c']);

      unsubscribe();
    });

    it('should not notify subscribers of nested path in array changes', () => {
      const state = anchor([{ name: 'John' }], { recursive: 'flat' });
      const handler = vi.fn();
      const childHandler = vi.fn();
      const unsubscribe = derive(state, handler);
      const childUnsubscribe = derive(state[0], childHandler);

      // This change should trigger a notification.
      state.push({ name: 'Jane' });

      expect(handler).toHaveBeenCalledTimes(2); // init + push
      expect(handler).toHaveBeenNthCalledWith(1, state, { type: 'init', keys: [] });
      expect(handler).toHaveBeenNthCalledWith(2, state, {
        type: 'push',
        prev: [{ name: 'John' }],
        keys: [],
        value: [{ name: 'Jane' }],
      });

      // This change should not trigger a top-level notification, but should trigger a child notification.
      state[0].name = 'John Smith';

      expect(handler).not.toHaveBeenCalledTimes(3);
      expect(childHandler).toHaveBeenCalledTimes(2); // init + set
      expect(childHandler).toHaveBeenNthCalledWith(1, state[0], { type: 'init', keys: [] });
      expect(childHandler).toHaveBeenNthCalledWith(2, state[0], {
        type: 'set',
        prev: 'John',
        keys: ['name'],
        value: 'John Smith',
      });
      expect(state).toEqual([{ name: 'John Smith' }, { name: 'Jane' }]);
      expect(state[0].name).toBe('John Smith');

      unsubscribe();
      childUnsubscribe();
    });
  });

  describe('Controller', () => {
    it('should provide subscribe function to listen for changes', () => {
      const state = anchor({ count: 0 });
      const controller = derive.resolve(state);

      expect(controller).toBeDefined();
      expect(typeof controller?.subscribe).toBe('function');
      expect(controller?.subscribe).toBeInstanceOf(Function);
    });

    it('should provide destroy function to clean up', () => {
      const state = anchor({ count: 0 });
      const controller = derive.resolve(state);

      expect(controller).toBeDefined();
      expect(typeof controller?.destroy).toBe('function');

      // After destroy, state should still work but cleanup internal references
      controller?.destroy();
    });
  });

  describe('Immutability', () => {
    it('should not mutate the original object', () => {
      const original = { foo: 'bar', nested: { value: 1 } };
      const state = anchor(original);

      state.foo = 'baz';
      state.nested.value = 2;

      expect(original.foo).toBe('bar');
      expect(original.nested.value).toBe(1);
      expect(state.foo).toBe('baz');
      expect(state.nested.value).toBe(2);
    });

    it('should not mutate the original array', () => {
      const original = [1, 2, 3];
      const state = anchor(original);

      state[0] = 10;
      state.push(4);

      expect(original[0]).toBe(1);
      expect(original.length).toBe(3);
      expect(state[0]).toBe(10);
      expect(state.length).toBe(4);
    });
  });

  describe('Mutable (unsafe)', () => {
    it('should mutates the original object', () => {
      const original = { count: 1, foo: 'bar' };
      const state = anchor.raw(original);

      state.count++;

      expect(original.count).toBe(2);
      expect(original.foo).toBe('bar');
      expect(state.count).toBe(2);
      expect(state.foo).toBe('bar');
    });

    it('should mutates nested value of the original object', () => {
      const original = { count: 1, nested: { value: 1 } };
      const state = anchor.raw(original);

      state.count++;
      state.nested.value++;

      expect(original.count).toBe(2);
      expect(original.nested.value).toBe(2);
      expect(state.count).toBe(2);
      expect(state.nested.value).toBe(2);
    });

    it('should mutates the original array', () => {
      const original = [1, 2, 3];
      const state = anchor.raw(original);

      state.push(4);

      expect(original.length).toBe(4);
      expect(original[3]).toBe(4);
      expect(state.length).toBe(4);
      expect(state[3]).toBe(4);
    });

    it('should mutates nested value of the original array', () => {
      const original = [{ value: 1 }];
      const state = anchor.raw(original);

      state[0].value++;
      state.push({ value: 3 });

      expect(original[0].value).toBe(2);
      expect(original[1].value).toBe(3);
      expect(state[0].value).toBe(2);
      expect(state[1].value).toBe(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle setting same value', () => {
      const state = anchor({ count: 1 });
      const handler = vi.fn();

      const unsubscribe = derive(state, handler);
      state.count = 1; // Same value

      // Should not trigger update
      expect(handler).toHaveBeenCalledTimes(1); // only init
      unsubscribe();
    });

    it('should handle nested array operations', () => {
      const state = anchor({
        todos: [
          { id: 1, text: 'Task 1' },
          { id: 2, text: 'Task 2' },
        ],
      });

      state.todos.push({ id: 3, text: 'Task 3' });
      expect(state.todos.length).toBe(3);
      expect(state.todos[2].text).toBe('Task 3');
    });

    it('should handle Map objects', () => {
      const map = new Map([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);
      const state = anchor({ map });

      expect(state.map).toBeInstanceOf(Map);
      expect(state.map.get('key1')).toBe('value1');
    });

    it('should handle Set objects', () => {
      const set = new Set(['value1', 'value2']);
      const state = anchor({ set });

      expect(state.set).toBeInstanceOf(Set);
      expect(state.set.has('value1')).toBe(true);
    });
  });

  describe('Direct Map and Set Anchoring', () => {
    it('should anchor Map directly', () => {
      const map = new Map([
        ['a', 1],
        ['b', 2],
      ]);
      const state = anchor(map);

      expect(state).toBeInstanceOf(Map);
      expect(state.get('a')).toBe(1);

      state.set('c', 3);
      expect(state.get('c')).toBe(3);
      expect(state.size).toBe(3);
    });

    it('should anchor Set directly', () => {
      const set = new Set([1, 2]);
      const state = anchor(set);

      expect(state).toBeInstanceOf(Set);
      expect(state.has(1)).toBe(true);

      state.add(3);
      expect(state.has(3)).toBe(true);
      expect(state.size).toBe(3);
    });
  });
});
