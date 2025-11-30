import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook } from '@testing-library/react';
import { useObserverNode } from '../../src/view/index.js';
import { anchor, getObserver } from '@anchorlib/core';

// Mock the debugRender function since it's not available in tests
vi.mock('../../src', async () => {
  const actual = await vi.importActual('../../src');
  return {
    ...actual,
    debugRender: vi.fn(),
  };
});

describe('Anchor React - Observer', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    errorSpy?.mockRestore();
    vi.useRealTimers();
  });

  describe('useObserverNode', () => {
    describe('Basic Usage', () => {
      it('should create an observer node with Unobserve component and version', () => {
        const { result } = renderHook(() => useObserverNode());

        const [Unobserve, version] = result.current;

        expect(Unobserve).toBeInstanceOf(Function);
        expect(typeof version).toBe('number');
      });

      it('should create observer node with dependencies', () => {
        const state = anchor({ count: 42 });
        const { result } = renderHook(() => useObserverNode([state], 'TestObserver'));

        const [Unobserve, version] = result.current;

        expect(Unobserve).toBeInstanceOf(Function);
        expect(typeof version).toBe('number');
        expect(getObserver()).toBeDefined();

        render(<Unobserve />);
      });
    });
  });
});
