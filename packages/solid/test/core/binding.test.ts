import { describe, expect, it } from 'vitest';
import { ELEMENT_OBSERVER_REGISTRY, REF_REGISTRY } from '../../src/reactive.js';

describe('Anchor Solid - Binding System', () => {
  describe('REF_REGISTRY', () => {
    it('should be a WeakSet for tracking refs', () => {
      expect(REF_REGISTRY).toBeInstanceOf(WeakSet);
    });
  });

  describe('OWNER_REGISTRY', () => {
    it('should be a WeakMap for tracking owners', () => {
      expect(ELEMENT_OBSERVER_REGISTRY).toBeInstanceOf(WeakMap);
    });
  });
});
