import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor } from '../../src/index.js';

describe('Anchor Core - Mutation', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Source Immutability', () => {
    const { cloned } = anchor.configs();

    beforeEach(() => {
      anchor.configure({ cloned: true });
    });

    afterEach(() => {
      anchor.configure({ cloned });
    });

    it('should not mutate the original object in a cloned mode', () => {
      const original = { foo: 'bar', nested: { value: 1 } };
      const state = anchor(original);

      state.foo = 'baz';
      state.nested.value = 2;

      expect(original.foo).toBe('bar');
      expect(original.nested.value).toBe(1);
      expect(state.foo).toBe('baz');
      expect(state.nested.value).toBe(2);
    });

    it('should not mutate the original array in a cloned mode', () => {
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

  describe('Source Mutable (unsafe)', () => {
    const { cloned } = anchor.configs();

    beforeEach(() => {
      anchor.configure({ cloned: true });
    });

    afterEach(() => {
      anchor.configure({ cloned });
    });

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
});
