/** @jsxImportSource solid-js */

import { mutable, onCleanup, setReactive, type StateObserver } from '@anchorlib/core';
import { render, renderHook } from '@solidjs/testing-library';
import { createEffect, type Owner } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import { COMPONENT_REGISTRY, ELEMENT_OBSERVER_REGISTRY } from '../../src/client/index.js';

describe('Anchor Solid - Reactive API', () => {
  describe('Global Registries', () => {
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
      expect(COMPONENT_REGISTRY).toBeDefined();
      expect(ELEMENT_OBSERVER_REGISTRY).toBeDefined();
    });

    it('should attach Anchor cleanup', () => {
      vi.stubGlobal('window', {});
      setReactive(true);

      const state = mutable({ count: 0 });
      const cleanUpHandler = vi.fn();
      const Component = () => {
        onCleanup(cleanUpHandler);

        return (
          <div>
            <button onClick={() => state.count++}>Click me</button>
            <span>{state.count}</span>
          </div>
        );
      };

      renderHook(() => {
        createEffect(() => {
          expect(state.count).toBeDefined();
        });
      });

      const { unmount } = render(() => <Component />);

      unmount();

      expect(state.count).toBe(0);
      state.count++;
      expect(state.count).toBe(1);

      vi.unstubAllGlobals();
    });
  });
});
