import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor } from '../../src/index.js';
import { softEntries, softKeys } from '../../src/utils/clone.js';

describe('Anchor Core - Prototype Pollution Protection', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    anchor.configure({ secureWrite: true });
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Proxy Setter Guard', () => {
    it('should reject __proto__ assignment directly on state', () => {
      const state = anchor({ name: 'test' });

      // Simulate prototype pollution attempt
      const payload = JSON.parse('{"__proto__": {"polluted": true}}');

      // Direct assignment
      (state as any).__proto__ = payload.__proto__;

      expect(Object.getPrototypeOf(state)).toEqual(Object.prototype);
    });

    it('should reject __proto__ assignment using Reflect.set', () => {
      const state = anchor({ name: 'test' });

      Reflect.set(state, '__proto__', { polluted: true });

      expect(Object.getPrototypeOf(state)).toEqual(Object.prototype);
    });
  });

  describe('anchor.assign Guard', () => {
    it('should reject __proto__ in object assignment', () => {
      const state = anchor({ name: 'test' });
      const payload = JSON.parse('{"__proto__": {"polluted": true}}');

      anchor.assign(state, payload);

      expect(Object.getPrototypeOf(state)).toEqual(Object.prototype);
      expect(Object.prototype.hasOwnProperty.call(state, '__proto__')).toBe(false);
    });

    it('should reject other poisoned keys in assign', () => {
      const state = anchor({ name: 'test' });
      const payload = JSON.parse('{"__defineGetter__": {"polluted": true}}');

      anchor.assign(state, payload);
      expect(Object.prototype.hasOwnProperty.call(state, '__defineGetter__')).toBe(false);
    });
  });

  describe('anchor.parse Guard', () => {
    it('should strip __proto__ during parsing', () => {
      // In JS, JSON.parse('{"__proto__":{"polluted":true}}') parses as an object with __proto__ property
      const payload = '{"name": "test", "__proto__": {"polluted": true}}';

      const state = anchor.parse(payload) as any;

      expect(state.name).toBe('test');
      expect(Object.getPrototypeOf(state)).toEqual(Object.prototype);
      expect(Object.prototype.hasOwnProperty.call(state, '__proto__')).toBe(false);
    });
  });

  describe('Disabled secureWrite mode', () => {
    it('should allow prototype pollution if secureWrite is false (opt-out behavior)', () => {
      anchor.configure({ secureWrite: false });

      const payload = '{"name": "test", "__proto__": {"polluted": true}}';
      const state = anchor.parse(payload) as any;

      expect(state.name).toBe('test');
      // When secureWrite is false, __proto__ will be present as an own property from JSON.parse
      expect(Object.prototype.hasOwnProperty.call(state, '__proto__')).toBe(true);

      // Reset config
      anchor.configure({ secureWrite: true });
    });
  });

  describe('softEntries and softKeys Guard', () => {
    it('should filter poisoned keys when secureWrite is true', () => {
      const payload = JSON.parse('{"name": "test", "__proto__": {"polluted": true}}');

      const entries = softEntries(payload);
      expect(entries.find(([key]) => key === '__proto__')).toBeUndefined();

      const keys = softKeys(payload);
      expect(keys.includes('__proto__')).toBe(false);
    });

    it('should not filter poisoned keys when secureWrite is false', () => {
      anchor.configure({ secureWrite: false });
      const payload = JSON.parse('{"name": "test", "__proto__": {"polluted": true}}');

      const entries = softEntries(payload);
      expect(entries.find(([key]) => key === '__proto__')).toBeDefined();

      const keys = softKeys(payload);
      expect(keys.includes('__proto__')).toBe(true);

      anchor.configure({ secureWrite: true });
    });
  });
});
