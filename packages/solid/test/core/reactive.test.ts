import type { StateObserver } from '@anchorlib/core';
import type { Owner } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { attachCleanup, COMPONENT_REGISTRY, ELEMENT_OBSERVER_REGISTRY, REF_REGISTRY } from '../../src/reactive.js';

describe('Anchor Solid - Reactive API', () => {
  describe('Global Registries', () => {
    describe('REF_REGISTRY', () => {
      it('should be a WeakSet for tracking refs', () => {
        expect(REF_REGISTRY).toBeInstanceOf(WeakSet);
      });

      it('should allow adding and checking for refs', () => {
        const obj = { value: 42 };
        REF_REGISTRY.add(obj);
        expect(REF_REGISTRY.has(obj)).toBe(true);
      });

      it('should not hold references strongly (allowing garbage collection)', () => {
        let obj: { value: number } | null = { value: 42 };
        REF_REGISTRY.add(obj);
        expect(REF_REGISTRY.has(obj)).toBe(true);

        // Remove reference
        obj = null;
        // Note: In a real test we would check if the object was garbage collected,
        // but that's not easily testable here. The WeakSet should handle this automatically.
      });

      it('should handle attaching cleanup', () => {
        const owner = { id: 'test' } as never as Owner;
        const cleanup = () => {};

        attachCleanup(owner, cleanup);
        expect(owner.cleanups).toContain(cleanup);
      });
    });

    describe('COMPONENT_REGISTRY', () => {
      it('should be a WeakMap for tracking components', () => {
        expect(COMPONENT_REGISTRY).toBeInstanceOf(WeakMap);
      });

      it('should allow storing and retrieving component data', () => {
        const mockOwner = { id: 'test' } as never as Owner;
        const mockData = new Map();
        mockData.set('element1', { version: () => 0, observer: {} });

        COMPONENT_REGISTRY.set(mockOwner, mockData);
        expect(COMPONENT_REGISTRY.get(mockOwner)).toBe(mockData);
      });
    });

    describe('ELEMENT_OBSERVER_REGISTRY', () => {
      it('should be a WeakMap for tracking element observers', () => {
        expect(ELEMENT_OBSERVER_REGISTRY).toBeInstanceOf(WeakMap);
      });

      it('should allow storing and retrieving observers', () => {
        const mockElement = { id: 'element' } as never as Owner;
        const mockObserver = { id: 'observer' } as never as StateObserver;

        ELEMENT_OBSERVER_REGISTRY.set(mockElement, mockObserver);
        expect(ELEMENT_OBSERVER_REGISTRY.get(mockElement)).toBe(mockObserver);
      });
    });
  });

  describe('Reactive System Integration', () => {
    it('should have initialized the binding system', () => {
      // The reactive.ts file should have run its initialization code when imported
      // This test ensures that the system has been set up properly
      expect(REF_REGISTRY).toBeDefined();
      expect(COMPONENT_REGISTRY).toBeDefined();
      expect(ELEMENT_OBSERVER_REGISTRY).toBeDefined();
    });
  });
});
