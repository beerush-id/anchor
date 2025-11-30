import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEBUG_RENDERER_DURATION,
  debugRender,
  isDebugRenderer,
  isDevMode,
  isStrictMode,
  setDebugRenderer,
  setDevMode,
} from '../../src/dev';

describe('Anchor React - Dev', () => {
  beforeEach(() => {
    setDevMode(true, true);
    setDebugRenderer(false, 300);
  });

  afterEach(() => {
    setDevMode(false, false);
    setDebugRenderer(false);
  });

  describe('Dev Mode Functions', () => {
    it('should set and get dev mode correctly', () => {
      expect(isDevMode()).toBe(true);

      setDevMode(false);
      expect(isDevMode()).toBe(false);

      setDevMode(true);
      expect(isDevMode()).toBe(true);
    });

    it('should set strict mode when provided', () => {
      expect(isStrictMode()).toBe(true);

      setDevMode(true, false);
      expect(isStrictMode()).toBe(false);

      setDevMode(false, true);
      expect(isStrictMode()).toBe(true);
    });

    it('should preserve strict mode when not provided', () => {
      setDevMode(false, false);
      expect(isStrictMode()).toBe(false);

      setDevMode(true); // No strict mode provided
      expect(isStrictMode()).toBe(false); // Should remain false
    });
  });

  describe('Debug Renderer Functions', () => {
    it('should set and get debug renderer correctly', () => {
      expect(isDebugRenderer()).toBe(false);

      setDebugRenderer(true);
      expect(isDebugRenderer()).toBe(true);

      setDebugRenderer(false);
      expect(isDebugRenderer()).toBe(false);
    });

    it('should set debug renderer duration when provided', () => {
      expect(DEBUG_RENDERER_DURATION).toBe(300);

      setDebugRenderer(true, 500);
      expect(DEBUG_RENDERER_DURATION).toBe(500);

      setDebugRenderer(false, 100);
      expect(DEBUG_RENDERER_DURATION).toBe(100);
    });

    it('should preserve debug renderer duration when not provided', () => {
      setDebugRenderer(true, 500);
      expect(DEBUG_RENDERER_DURATION).toBe(500);

      setDebugRenderer(false); // No duration provided
      expect(DEBUG_RENDERER_DURATION).toBe(500); // Should remain 500
    });
  });

  describe('debugRender', () => {
    let mockElement: HTMLElement;
    let mockRef: { current: HTMLElement | null };

    beforeEach(() => {
      mockElement = document.createElement('div');
      mockRef = { current: mockElement };
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.clearAllTimers();
    });

    it('should not do anything when debug renderer is disabled', () => {
      setDebugRenderer(false);

      debugRender(mockRef);

      expect(mockElement.style.boxShadow).toBe('');
    });

    it('should apply box shadow to element when debug renderer is enabled', () => {
      setDebugRenderer(true);

      debugRender(mockRef);
      vi.advanceTimersByTime(0);
      expect(mockElement.style.boxShadow).toBe('0 0 0 1px rgba(0,140,255,0.75)');

      // Fast-forward timers
      vi.advanceTimersByTime(DEBUG_RENDERER_DURATION);

      expect(mockElement.style.boxShadow).toBe('');
    });

    it('should use custom color for error elements', () => {
      setDebugRenderer(true);

      // Simulate calling with null ref first to trigger the error path
      const nullRef = { current: null };
      debugRender(nullRef);

      // Then call with valid element
      debugRender(mockRef);
      vi.advanceTimersByTime(0);
      expect(mockElement.style.boxShadow).toBe('0 0 0 1px rgba(0,140,255,0.75)');
    });

    it('should handle null element reference', () => {
      setDebugRenderer(true);

      const nullRef = { current: null };
      debugRender(nullRef);
      nullRef.current = document.createElement('div');
      vi.advanceTimersByTime(0);
      expect(nullRef.current.style.boxShadow).not.toBe('');
    });

    it('should handle non-HTMLElement elements', () => {
      setDebugRenderer(true);

      const textNode = document.createTextNode('test');
      const textRef = { current: textNode as any };

      expect(() => debugRender(textRef)).not.toThrow();
    });
  });
});
