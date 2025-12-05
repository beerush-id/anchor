import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, getCurrentStack } from '../../src/index.js';
import {
  derived,
  DerivedRef,
  destroyRef,
  immutable,
  ImmutableRef,
  isDerivedRef,
  isImmutableRef,
  isMutableRef,
  isValueRef,
  mutable,
  MutableRef,
} from '../../src/ref.js';
import { createStack, withStack } from '../../src/stack.js';

describe('Anchor Core - Ref', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  describe('MutableRef', () => {
    it('should create a mutable reference with initial value', () => {
      const ref = new MutableRef(42);
      expect(ref.value).toBe(42);
    });

    it('should allow getting and setting value', () => {
      const ref = new MutableRef(42);
      expect(ref.value).toBe(42);

      ref.value = 100;
      expect(ref.value).toBe(100);
    });

    it('should destroy the reference', () => {
      const ref = new MutableRef({ foo: 'bar' });

      ref.destroy();

      expect(anchor.has(ref.source)).toBe(false);
    });
  });

  describe('ImmutableRef', () => {
    it('should create an immutable reference with initial value', () => {
      const ref = new ImmutableRef(42);
      expect(ref.value).toBe(42);
    });

    it('should allow getting value', () => {
      const ref = new ImmutableRef(42);
      expect(ref.value).toBe(42);
    });

    it('should throw error when trying to set value', () => {
      vi.useFakeTimers();

      const ref = new ImmutableRef(42);
      expect(errorSpy).not.toHaveBeenCalled();

      ref.value = 100;
      vi.runAllTimers();

      expect(errorSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should destroy the reference', () => {
      const ref = new ImmutableRef({ foo: 'bar' });

      ref.destroy();

      expect(anchor.has(ref.source)).toBe(false);
    });
  });

  describe('DerivedRef', () => {
    it('should create a derived reference with computation function', () => {
      const source = mutable(10);
      const derivedRef = new DerivedRef(() => source.value * 2);

      expect(derivedRef.value).toBe(20);
    });

    it('should update when dependencies change', () => {
      const source = mutable(10);
      const derivedRef = new DerivedRef(() => source.value * 2);

      expect(derivedRef.value).toBe(20);

      source.value = 15;
      expect(derivedRef.value).toBe(30);
    });

    it('should destroy the reference', () => {
      const source = mutable(10);
      const derivedRef = new DerivedRef(() => source.value * 2);

      expect(anchor.has(derivedRef.state)).toBe(true);

      derivedRef.destroy();

      // After destruction, changing the source should not affect the derived ref
      source.value = 15;
      expect(derivedRef.value).toBe(20); // Should retain the last computed value
      expect(anchor.has(derivedRef.state)).toBe(false);
    });
  });

  describe('mutable function', () => {
    it('should create MutableRef for primitive values', () => {
      const ref = mutable(42);
      expect(isMutableRef(ref)).toBe(true);
      expect(ref.value).toBe(42);

      ref.value = 100;
      expect(ref.value).toBe(100);
    });

    it('should create reactive state for linkable objects', () => {
      const ref = mutable({ count: 42 });
      expect(isMutableRef(ref)).toBe(false); // Not a MutableRef
      expect(anchor.has(ref)).toBe(true); // But is reactive

      expect(ref.count).toBe(42);
      ref.count = 100;
      expect(ref.count).toBe(100);
    });
  });

  describe('immutable function', () => {
    it('should create ImmutableRef for primitive values', () => {
      vi.useFakeTimers();

      const ref = immutable(42);
      expect(isImmutableRef(ref)).toBe(true);
      expect(ref.value).toBe(42);

      (ref as MutableRef<number>).value = 100;
      vi.runAllTimers();

      expect(ref.value).toBe(42);
      expect(errorSpy).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should create immutable reactive state for linkable objects', () => {
      const ref = immutable({ count: 42 });

      expect(isImmutableRef(ref)).toBe(false); // Not an ImmutableRef
      expect(anchor.has(ref)).toBe(true); // But is reactive
      expect(errorSpy).not.toHaveBeenCalled();

      expect(ref.count).toBe(42);

      (ref as { count: number }).count = 100;

      expect(ref.count).toBe(42);
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('derived function', () => {
    it('should create a DerivedRef', () => {
      const source = mutable(10);
      const ref = derived(() => source.value * 2);

      expect(isDerivedRef(ref)).toBe(true);
      expect(ref.value).toBe(20);
    });

    it('should update when dependencies change', () => {
      const source = mutable(10);
      const ref = derived(() => source.value * 2);

      expect(ref.value).toBe(20);

      source.value = 15;
      expect(ref.value).toBe(30);
    });
  });

  describe('Type checking functions', () => {
    it('should correctly identify MutableRef', () => {
      const mutableRef = new MutableRef(42);
      const immutableRef = new ImmutableRef(42);
      const derivedRef = new DerivedRef(() => 42);

      expect(isMutableRef(mutableRef)).toBe(true);
      expect(isMutableRef(immutableRef)).toBe(false);
      expect(isMutableRef(derivedRef)).toBe(false);
      expect(isMutableRef(42)).toBe(false);
    });

    it('should correctly identify ImmutableRef', () => {
      const mutableRef = new MutableRef(42);
      const immutableRef = new ImmutableRef(42);
      const derivedRef = new DerivedRef(() => 42);

      expect(isImmutableRef(immutableRef)).toBe(true);
      expect(isImmutableRef(mutableRef)).toBe(false);
      expect(isImmutableRef(derivedRef)).toBe(false);
      expect(isImmutableRef(42)).toBe(false);
    });

    it('should correctly identify DerivedRef', () => {
      const mutableRef = new MutableRef(42);
      const immutableRef = new ImmutableRef(42);
      const derivedRef = new DerivedRef(() => 42);

      expect(isDerivedRef(derivedRef)).toBe(true);
      expect(isDerivedRef(mutableRef)).toBe(false);
      expect(isDerivedRef(immutableRef)).toBe(false);
      expect(isDerivedRef(42)).toBe(false);
    });

    it('should correctly identify any ref', () => {
      const mutableRef = new MutableRef(42);
      const immutableRef = new ImmutableRef(42);
      const derivedRef = new DerivedRef(() => 42);

      expect(isValueRef(mutableRef)).toBe(true);
      expect(isValueRef(immutableRef)).toBe(true);
      expect(isValueRef(derivedRef)).toBe(true);
      expect(isValueRef(42)).toBe(false);
    });
  });

  describe('destroyRef function', () => {
    it('should destroy MutableRef', () => {
      const ref = new MutableRef({ foo: 'bar' });

      expect(anchor.get(ref.source)).toEqual({ value: { foo: 'bar' } });
      expect(anchor.has(ref.source)).toBe(true);

      destroyRef(ref);

      expect(anchor.has(ref.source)).toBe(false);
    });

    it('should destroy ImmutableRef', () => {
      const ref = new ImmutableRef({ foo: 'bar' });

      expect(anchor.get(ref.source)).toEqual({ value: { foo: 'bar' } });
      expect(anchor.has(ref.source)).toBe(true);

      destroyRef(ref);

      expect(anchor.has(ref.source)).toBe(false);
    });

    it('should destroy linkable objects', () => {
      const state = anchor({ foo: 'bar' });

      expect(anchor.get(state)).toEqual({ foo: 'bar' });
      expect(anchor.has(state)).toBe(true);

      destroyRef(state);

      expect(anchor.has(state)).toBe(false);
    });
  });

  describe('Stack functions', () => {
    it('should create a new stack with index 0 and empty states map', () => {
      const stack = createStack();

      expect(stack.index).toBe(0);
      expect(stack.states).toBeInstanceOf(Map);
      expect(stack.states.size).toBe(0);
    });

    it('should execute function within stack context', () => {
      const stack = createStack();

      const result = withStack(stack, () => {
        expect(getCurrentStack()).toBe(stack);
        return 'test-result';
      });

      expect(result).toBe('test-result');
    });

    it('should maintain separate stack contexts', () => {
      const stack1 = createStack();
      const stack2 = createStack();

      stack1.index = 5;
      stack2.index = 10;

      withStack(stack1, () => {
        expect(stack1.index).toBe(5);
        expect(stack2.index).toBe(10);
      });

      withStack(stack2, () => {
        expect(stack1.index).toBe(5);
        expect(stack2.index).toBe(10);
      });
    });

    it('should restore previous stack after execution', () => {
      const outerStack = createStack();
      const innerStack = createStack();

      outerStack.index = 1;

      withStack(outerStack, () => {
        withStack(innerStack, () => {
          innerStack.index = 2;
        });
        expect(outerStack.index).toBe(1);
      });
    });
  });

  describe('Stack caching behavior', () => {
    beforeEach(() => {
      anchor.configure({ production: false });
    });

    afterEach(() => {
      anchor.configure({ production: true });
    });

    it('should cache mutable refs with same initialization in non-production mode', () => {
      const stack = createStack();
      const initValue = 42;

      // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
      let ref1, ref2;

      // Call withinStack twice with the same stack and init value
      withStack(stack, () => {
        ref1 = mutable(initValue);
      });

      // Reset index to simulate the same position in stack
      stack.index = 0;

      withStack(stack, () => {
        ref2 = mutable(initValue);
      });

      expect(ref1).toBe(ref2);
    });

    it('should cache immutable refs with same initialization in non-production mode', () => {
      const stack = createStack();
      const initValue = 'test';

      // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
      let ref1, ref2;

      // Call withinStack twice with the same stack and init value
      withStack(stack, () => {
        ref1 = immutable(initValue);
      });

      // Reset index to simulate the same position in stack
      stack.index = 0;

      withStack(stack, () => {
        ref2 = immutable(initValue);
      });

      expect(ref1).toBe(ref2);
    });

    it('should not cache refs with different initialization in non-production mode', () => {
      const stack = createStack();

      // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
      let ref1, ref2;

      // Call withinStack twice with the same stack but different init values
      withStack(stack, () => {
        ref1 = mutable(42);
      });

      // Reset index to simulate the same position in stack
      stack.index = 0;

      withStack(stack, () => {
        ref2 = mutable(43);
      });

      expect(ref1).not.toBe(ref2);
    });

    it('should not cache when production mode is enabled', () => {
      // Save original setting
      const originalProduction = anchor.configs().production;

      // Enable production mode
      anchor.configure({ production: true });

      const stack = createStack();
      const initValue = 42;

      // biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
      let ref1, ref2;

      // Call withinStack twice with the same stack and init value
      withStack(stack, () => {
        ref1 = mutable(initValue);
      });

      // Reset index to simulate the same position in stack
      stack.index = 0;

      withStack(stack, () => {
        ref2 = mutable(initValue);
      });

      // Restore original setting
      anchor.configure({ production: originalProduction });

      expect(ref1).not.toBe(ref2);
    });

    it('should properly increment stack index', () => {
      const stack = createStack();

      withStack(stack, () => {
        mutable(1);
        expect(stack.index).toBe(1);

        immutable('test');
        expect(stack.index).toBe(2);
      });

      // Index should reset after withinStack
      expect(stack.index).toBe(2);
    });
  });
});
