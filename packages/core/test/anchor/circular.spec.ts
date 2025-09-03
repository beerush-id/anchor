import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, derive } from '@anchor/core';

describe('Anchor - Circular References', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // errorSpy = vi.spyOn(console, 'error');
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Basic Circular References', () => {
    it('should handle direct self-reference', () => {
      const obj: Record<string, unknown> = { name: 'test' };
      obj.self = obj;

      const state = anchor(obj);

      expect(state.name).toBe('test');
      expect(state.self).toBe(state);
      expect((state.self as { self: unknown }).self).toBe(state);
    });

    it('should handle array with self-reference', () => {
      const arr: unknown[] = [1, 2, 3];
      arr.push(arr);

      const state = anchor(arr);

      expect(state[0]).toBe(1);
      expect(state[3]).toBe(state);
      expect((state[3] as unknown[])[3]).toBe(state);
    });

    it('should handle Map with self-reference', () => {
      const map = new Map<string, unknown>();
      map.set('self', map);

      const state = anchor({ map });

      expect(state.map).toBeInstanceOf(Map);
      expect(state.map.get('self')).toBe(state.map);
    });

    it('should handle Set with self-reference', () => {
      const set = new Set<unknown>();
      set.add(set);

      const state = anchor({ set });

      expect(state.set).toBeInstanceOf(Set);
      expect(state.set.has(state.set)).toBe(true);
    });
  });

  describe('Advanced Circular References', () => {
    it('should handle mutual references between objects', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const objA: any = { name: 'A', ref: null };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const objB: any = { name: 'B', ref: null };

      objA.ref = objB;
      objB.ref = objA;

      const state = anchor({ objA, objB });

      // expect(state.objA.name).toBe('A');
      // expect(state.objB.name).toBe('B');
      expect(state.objA.ref).toBeDefined();
      expect(state.objA.ref).toBe(state.objB);
      expect(state.objB.ref).toBe(state.objA);
      expect(state.objA.ref.ref).toBe(state.objA);
    });

    it('should handle circular references in nested objects', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const root: any = {
        id: 'root',
        child: {
          id: 'child',
          parent: null as unknown as Record<string, unknown>,
        },
      };

      (root.child as Record<string, unknown>).parent = root;

      const state = anchor(root);

      expect(state.id).toBe('root');
      expect(state.child.id).toBe('child');
      expect(state.child.parent).toBe(state);
      expect(state.child.parent.child.parent).toBe(state);
    });

    it('should handle complex circular references in arrays', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr1: any[] = [1, 2];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr2: any[] = [3, 4];

      arr1.push(arr2);
      arr2.push(arr1);

      const state = anchor({ arr1, arr2 });

      expect(state.arr1[0]).toBe(1);
      expect(state.arr1[2]).toBe(state.arr2);
      expect(state.arr2[2]).toBe(state.arr1);
      expect(state.arr1[2][2]).toBe(state.arr1);
    });

    it('should handle circular references with multiple levels', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const level1: any = { id: 'level1' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const level2: any = { id: 'level2', parent: level1 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const level3: any = { id: 'level3', parent: level2 };

      level1.child = level2;
      level2.child = level3;
      level3.child = level1; // Completing the circle

      const state = anchor({ level1, level2, level3 });

      expect(state.level1.id).toBe('level1');
      expect(state.level2.parent).toBe(state.level1);
      expect(state.level3.child).toBe(state.level1);
      expect(state.level1.child.child.child).toBe(state.level1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle circular references with property updates', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = { name: 'original', value: 1 };
      obj.self = obj;

      const state = anchor(obj);
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      // Update a property
      state.name = 'updated';

      expect(state.name).toBe('updated');
      expect(state.self.name).toBe('updated');
      expect(state.self.self.name).toBe('updated');

      // Verify the event was triggered correctly
      expect(handler).toHaveBeenCalledTimes(2); // init + update
      expect(handler.mock.calls[1][1].keys).toEqual(['name']);
      expect(handler.mock.calls[1][1].type).toBe('set');

      unsubscribe();
    });

    it('should handle circular references in array mutations', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr1: any[] = [1, 2];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr2: any[] = [3, 4];
      arr1.push(arr2);
      (arr2 as unknown[]).push(arr1);

      const state = anchor({ arr1, arr2 });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      // Perform array mutation
      state.arr1.push('new-item');

      expect(state.arr1[3]).toBe('new-item');
      expect(state.arr1[2][1]).toBe(state.arr2[1]);
      expect(state.arr2[2][3]).toBe('new-item');

      // Verify the event was triggered correctly
      expect(handler).toHaveBeenCalledTimes(2); // init + mutation
      expect(handler.mock.calls[1][1].keys[0]).toBe('arr1');
      expect(handler.mock.calls[1][1].type).toBe('push');

      unsubscribe();
    });

    it('should handle circular references with object assignments', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = { name: 'test' };
      obj.self = obj;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const state = anchor({ container: {} as any });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      // Assign circular object
      state.container = obj;

      expect(state.container.name).toBe('test');
      expect(state.container.self).toBe(state.container);
      expect(state.container.self.self).toBe(state.container);

      // Verify the event was triggered correctly
      expect(handler).toHaveBeenCalledTimes(2); // init + assignment
      expect(handler.mock.calls[1][1].keys).toEqual(['container']);
      expect(handler.mock.calls[1][1].type).toBe('set');

      unsubscribe();
    });

    it('should handle deletion of properties in circular references', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = { name: 'test' };
      obj.self = obj;
      obj.ref = 'to-be-deleted';

      const state = anchor(obj);
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      // Delete a property
      delete state.ref;

      expect(state.ref).toBeUndefined();
      expect(state.self.ref).toBeUndefined();

      // Verify the event was triggered correctly
      expect(handler).toHaveBeenCalledTimes(2); // init + deletion
      expect(handler.mock.calls[1][1].keys).toEqual(['ref']);
      expect(handler.mock.calls[1][1].type).toBe('delete');

      unsubscribe();
    });

    it('should handle nested circular references with schema validation', () => {
      const schema = {
        shape: {
          user: {
            shape: {
              name: { _def: { typeName: 'ZodString' } },
              manager: {
                shape: {
                  name: { _def: { typeName: 'ZodString' } },
                },
              },
            },
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const user: any = { name: 'John' };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const manager: any = { name: 'Jane' };

      user.manager = manager;
      manager.employee = user; // Circular reference

      const state = anchor(user, { schema, strict: false });

      expect(state.name).toBe('John');
      expect(state.manager.name).toBe('Jane');
      expect(state.manager.employee).toBe(state);
      expect(state.manager.employee.manager.employee).toBe(state);
    });
  });

  describe('Event Handling with Circular References', () => {
    it('should correctly propagate events through circular references', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parent: any = { id: 'parent', children: [] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const child: any = { id: 'child', parent: null };

      (parent.children as unknown[]).push(child);
      child.parent = parent;

      const state = anchor({ parent, child });
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      // Update through the circular reference
      state.parent.children[0].id = 'updated-child';

      expect(state.child.id).toBe('updated-child');
      expect(state.parent.children[0].id).toBe('updated-child');

      // Should trigger event
      expect(handler).toHaveBeenCalledTimes(2); // init + update
      expect(handler.mock.calls[1][1].keys).toEqual(['parent', 'children', '0', 'id']);
      expect(handler.mock.calls[1][1].type).toBe('set');

      unsubscribe();
    });

    it('should handle multiple subscribers with circular references', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = { value: 1 };
      obj.self = obj;

      const state = anchor(obj);
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const unsubscribe1 = derive(state, handler1);
      const unsubscribe2 = derive(state, handler2);

      // Update value
      state.value = 2;

      expect(state.value).toBe(2);
      expect(state.self.value).toBe(2);

      // Both handlers should be called
      expect(handler1).toHaveBeenCalledTimes(2); // init + update
      expect(handler2).toHaveBeenCalledTimes(2); // init + update

      unsubscribe1();
      unsubscribe2();
    });

    it('should handle unsubscribe with circular references', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = { name: 'test' };
      obj.self = obj;

      const state = anchor(obj);
      const handler = vi.fn();
      const unsubscribe = derive(state, handler);

      // Unsubscribe
      unsubscribe();

      // Update should not trigger event
      state.name = 'updated';

      expect(state.name).toBe('updated');
      expect(state.self.name).toBe('updated');
      expect(handler).toHaveBeenCalledTimes(1); // Only init, no update
    });
  });
});
