import { describe, expect, it } from 'vitest';
import { isBrowser, isValueGetter, valueGetter } from '../../src/shared/env.js';

describe('Shared - Env', () => {
  describe('isBrowser', () => {
    it('should return true if window and document are defined', () => {
      expect(isBrowser()).toBe(typeof window !== 'undefined' && typeof document !== 'undefined');
    });
  });

  describe('valueGetter', () => {
    it('should create a value getter from a function', () => {
      let counter = 0;
      const fn = () => ++counter;

      const getter = valueGetter(fn);

      expect(isValueGetter(getter)).toBe(true);
      expect(getter()).toBe(1); // Call as function
      expect(getter.value).toBe(2); // Read as property (triggers the getter)
    });

    it('should create a value getter from an object with a value property', () => {
      const source = { value: 10 };

      const getter = valueGetter(source);

      expect(isValueGetter(getter)).toBe(true);
      expect(getter()).toBe(10); // Call as function

      // Update the source to verify the getter reads the live value
      source.value = 20;
      expect(getter.value).toBe(20); // Read as property (triggers the getter)
    });
  });
});
