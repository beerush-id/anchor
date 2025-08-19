import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, type ObjLike } from '../../src/index.js';

describe('Anchor Core - Read-Only', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Strict Immutability', () => {
    it('should prevent updating property', () => {
      const state = anchor({ count: 1 }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      state.count = 2;

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent adding property', () => {
      const state = anchor({ count: 1 }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (state as ObjLike).newProperty = 2;

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent deleting property', () => {
      const state = anchor({ count: 1 }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      delete (state as ObjLike).count;
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should prevent updating nested property', () => {
      const state = anchor({ count: 1, profile: { name: 'John' } }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      state.profile.name = 'John Smith';

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent deleting nested property', () => {
      const state = anchor({ count: 1, profile: { name: 'John' } }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      delete (state.profile as ObjLike).name;

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent adding nested property', () => {
      const state = anchor({ count: 1, profile: { name: 'John' } }, { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      (state.profile as ObjLike).newProperty = 2;

      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should prevent mutating array', () => {
      const state = anchor([1, 2, 3], { immutable: true });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      state.push(4);
      state.pop();
      state.unshift(0);
      state.shift();
      state.splice(1, 1);
      state.reverse();
      state.sort();
      state.fill(0);
      state.copyWithin(0, 1);

      expect(errorSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(9);

      errorSpy.mockRestore();
    });
  });
});
