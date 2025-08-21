import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, createObserver, setObserver } from '../../src/index.js';

describe('Anchor Core - Observable Object', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Object Observation', () => {
    it('should track property access when observable is enabled', () => {
      const state = anchor({ a: 1, b: 2 }, { observable: true });

      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Access properties to track them
      const valueA = state.a;
      const valueB = state.b;

      // Confirm accessed values
      expect(valueA).toBe(1);
      expect(valueB).toBe(2);

      const trackedProps = observer.states.get(anchor.get(state));
      restore();

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has('a')).toBe(true);
      expect(trackedProps?.has('b')).toBe(true);
    });

    it('should not track property access when observable is disabled', () => {
      const state = anchor({ a: 1, b: 2 }, { observable: false });

      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Access properties
      const valueA = state.a;
      const valueB = state.b;

      // Confirm accessed values
      expect(valueA).toBe(1);
      expect(valueB).toBe(2);

      const trackedProps = observer.states.get(anchor.get(state));
      restore();

      expect(trackedProps).toBeUndefined();
    });

    it('should trigger observer onChange when tracked properties change', () => {
      const state = anchor({ a: 1, b: 2 }, { observable: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);
      const restore = setObserver(observer);

      // Access property to track it
      const valueA = state.a;
      const valueB = state.b;

      expect(valueA).toBe(1);
      expect(valueB).toBe(2);

      restore();

      // Change the tracked property
      state.a = 3;

      expect(state.a).toBe(3);
      expect(onChange).toHaveBeenCalledWith({
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 3,
      });

      delete state.b;

      expect(state.b).toBeUndefined();
      expect(onChange).toHaveBeenCalledWith({
        type: 'delete',
        keys: ['b'],
        prev: 2,
      });
    });

    it('should track nested object properties', () => {
      const state = anchor({ nested: { a: 1, b: 2 } }, { observable: true });

      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Access nested properties to track them
      const valueA = state.nested.a;
      const valueB = state.nested.b;

      // Confirm accessed values
      expect(valueA).toBe(1);
      expect(valueB).toBe(2);

      const trackedProps = observer.states.get(anchor.get(state.nested));
      restore();

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has('a')).toBe(true);
      expect(trackedProps?.has('b')).toBe(true);
    });

    it('should track property access with circular references', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj: any = { a: 1 };
      obj.self = obj;
      const state = anchor(obj, { observable: true });

      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      // Access properties to track them
      const valueA = state.a;
      const circularRef = state.self;

      // Confirm accessed values
      expect(valueA).toBe(1);
      expect(circularRef).toBe(state);

      const trackedProps = observer.states.get(anchor.get(state));
      restore();

      expect(trackedProps).toBeDefined();
      expect(trackedProps?.has('a')).toBe(true);
      expect(trackedProps?.has('self')).toBe(true);
    });

    it('should handle multiple observers on the same property', () => {
      const state = anchor({ a: 1 }, { observable: true });
      const onChange1 = vi.fn();
      const onChange2 = vi.fn();

      const observer1 = createObserver(onChange1);
      const observer2 = createObserver(onChange2);

      const restore1 = setObserver(observer1);
      const valueA1 = state.a;
      expect(valueA1).toBe(1);
      restore1();

      const restore2 = setObserver(observer2);
      const valueA2 = state.a;
      expect(valueA2).toBe(1);
      restore2();

      // Change the tracked property
      state.a = 2;

      expect(onChange1).toHaveBeenCalledWith({
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 2,
      });

      expect(onChange2).toHaveBeenCalledWith({
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 2,
      });
    });
  });
});
