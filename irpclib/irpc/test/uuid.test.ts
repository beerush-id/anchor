import { describe, expect, it, vi } from 'vitest';
import { setUUIDProvider, uuid } from '../src/uuid.js';

describe('UUID', () => {
  describe('UUID Generation', () => {
    it('should generate a UUID', () => {
      const id = uuid();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it('should generate using simple UUID generator fallback', () => {
      vi.stubGlobal('crypto', {
        randomUUID: undefined,
      });

      expect(uuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);

      vi.restoreAllMocks();
    });

    it('should generate unique UUIDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(uuid());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('UUID Provider', () => {
    it('should allow setting custom UUID provider', () => {
      const customProvider = vi.fn().mockReturnValue('custom-uuid');
      setUUIDProvider(customProvider);

      const id = uuid();

      expect(customProvider).toHaveBeenCalled();
      expect(id).toBe('custom-uuid');
    });

    it('should reset to default provider when set to null', () => {
      // Set custom provider
      const customProvider = vi.fn().mockReturnValue('custom-uuid');
      setUUIDProvider(customProvider);

      // Reset to default
      // @ts-expect-error - Testing null provider
      setUUIDProvider(null);

      const id = uuid();

      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(id).not.toBe('custom-uuid');
    });
  });
});
