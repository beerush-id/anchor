import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, createObserver, setObserver } from '../../src/index.js';

describe('Anchor Core - Observable Observer Management', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Observer Management', () => {
    it('should properly manage multiple observers', () => {
      const state = anchor({ a: 1, b: 2 }, { observable: true });

      const onChange1 = vi.fn();
      const onChange2 = vi.fn();

      const observer1 = createObserver(onChange1);
      const observer2 = createObserver(onChange2);

      const restore1 = setObserver(observer1);

      const valueA = state.a; // Track property with observer1
      expect(valueA).toBe(1);

      restore1();

      const restore2 = setObserver(observer2);
      const valueB = state.b; // Track property with observer2
      expect(valueB).toBe(2);

      restore2();

      // Change both tracked properties
      state.a = 3;
      state.b = 4;

      expect(onChange1).toHaveBeenCalledWith({
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 3,
      });

      expect(onChange2).toHaveBeenCalledWith({
        type: 'set',
        keys: ['b'],
        prev: 2,
        value: 4,
      });
    });

    it('should properly clean up observers', () => {
      const state = anchor({ a: 1 }, { observable: true });
      const observer = createObserver(() => {});
      const restore = setObserver(observer);

      const valueA = state.a; // Track property
      expect(valueA).toBe(1);
      restore();
      observer.destroy(); // Clean up observer

      const trackedProps = observer.states.get(anchor.get(state));
      expect(trackedProps).toBeUndefined();
    });

    it('should handle observer context switching', () => {
      const state1 = anchor({ a: 1 }, { observable: true });
      const state2 = anchor({ b: 2 }, { observable: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);

      // Set observer context and access state1
      const restore1 = setObserver(observer);
      const valueA = state1.a;
      expect(valueA).toBe(1);
      restore1();

      // Switch observer context and access state2
      const restore2 = setObserver(observer);
      const valueB = state2.b;
      expect(valueB).toBe(2);
      restore2();

      // Changes should trigger the observer
      state1.a = 3;
      state2.b = 4;

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenNthCalledWith(1, {
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 3,
      });
      expect(onChange).toHaveBeenNthCalledWith(2, {
        type: 'set',
        keys: ['b'],
        prev: 2,
        value: 4,
      });
    });

    it('should handle nested stacks observer contexts', () => {
      const state = anchor({ a: 1, nested: { b: 2 } }, { observable: true });
      const onChange1 = vi.fn();
      const onChange2 = vi.fn();

      const observer1 = createObserver(onChange1);
      const observer2 = createObserver(onChange2);

      // Set outer observer context
      const restore1 = setObserver(observer1);

      const valueA = state.a;
      const valueAB = state.nested.b;
      expect(valueA).toBe(1);
      expect(valueAB).toBe(2);

      // Set inner observer context
      const restore2 = setObserver(observer2);
      const valueB = state.nested.b;

      expect(valueB).toBe(2);

      restore2(); // Restore inner context
      restore1(); // Restore outer context

      // Changes should trigger both observers
      state.a = 3;
      state.nested.b = 4;

      expect(onChange1).toHaveBeenCalledTimes(2);
      expect(onChange1).toHaveBeenNthCalledWith(1, {
        type: 'set',
        keys: ['a'],
        prev: 1,
        value: 3,
      });
      expect(onChange1).toHaveBeenNthCalledWith(2, {
        type: 'set',
        keys: ['b'],
        prev: 2,
        value: 4,
      });

      expect(onChange2).toHaveBeenCalledWith({
        type: 'set',
        keys: ['b'],
        prev: 2,
        value: 4,
      });
    });

    it('should properly handle observer destruction', () => {
      const state = anchor({ a: 1 }, { observable: true });
      const onChange = vi.fn();

      const observer = createObserver(onChange);

      const restore = setObserver(observer);
      const valueA = state.a;
      expect(valueA).toBe(1);
      restore();

      // Destroy observer
      observer.destroy();

      // Change should not trigger destroyed observer
      state.a = 2;
      expect(onChange).not.toHaveBeenCalled();

      // Tracked props should be cleaned up
      const trackedProps = observer.states.get(anchor.get(state));
      expect(trackedProps).toBeUndefined();
    });

    it('should handle multiple state types with observers', () => {
      const objState = anchor({ a: 1 }, { observable: true });
      const arrState = anchor([1, 2], { observable: true });
      const mapState = anchor(new Map([['key', 'value']]), { observable: true });
      const setState = anchor(new Set([1, 2]), { observable: true });

      const onChange = vi.fn();
      const observer = createObserver(onChange);

      const restore = setObserver(observer);

      // Access all state types
      const objVal = objState.a;
      const arrLen = arrState.length;
      const mapSize = mapState.size;
      const setSize = setState.size;

      expect(objVal).toBe(1);
      expect(arrLen).toBe(2);
      expect(mapSize).toBe(1);
      expect(setSize).toBe(2);

      restore();

      // Trigger changes
      objState.a = 2;
      arrState.push(3);
      mapState.set('key2', 'value2');
      setState.add(3);

      // Verify all changes were observed
      expect(onChange).toHaveBeenCalledTimes(4);
    });
  });
});
