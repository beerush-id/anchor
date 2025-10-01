import { describe, expect, it } from 'vitest';
import { OWNER_REGISTRY, REF_REGISTRY } from '../../src/binding';

describe('Anchor Solid - Binding System', () => {
  describe('REF_REGISTRY', () => {
    it('should be a WeakSet for tracking refs', () => {
      expect(REF_REGISTRY).toBeInstanceOf(WeakSet);
    });
  });

  describe('OWNER_REGISTRY', () => {
    it('should be a WeakMap for tracking owners', () => {
      expect(OWNER_REGISTRY).toBeInstanceOf(WeakMap);
    });
  });
});
