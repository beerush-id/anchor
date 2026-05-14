import { act, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mutable, onCleanup } from '../../src/core/index.js';
import { persistent } from '../../src/storage/index.js';
import AnchorBasic from '../core/anchor/anchor-basic.svelte';
import CounterBasic from '../core/anchor/counter.svelte';
import ReactiveBasic from '../core/anchor/reactive-basic.svelte';

describe('Anchor Svelte - Server', () => {
  describe('mutable', () => {
    describe('Basic Usage', () => {
      it('should create a reactive reference with initial value', () => {
        render(AnchorBasic);

        expect(() => mutable(0)).not.toThrow();
        expect(screen.getByTestId('state-value').textContent).toBe('42-test');
        expect(persistent).toBeDefined();
      });
    });
  });

  describe('reactive', () => {
    beforeEach(() => {
      vi.stubGlobal('window', undefined);
    });
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should create a reactive reference with initial value', async () => {
      await import('../../src/server/index.js');

      render(ReactiveBasic);
      const { unmount } = render(CounterBasic);

      const button = screen.getByTestId('increment');
      expect(button).toBeDefined();
      expect(screen.getByTestId('count').textContent).toBe('Count: 0');

      await act(() => {
        button.click();
      });

      expect(screen.getByTestId('state-value').textContent).toBe('42-test');
      expect(screen.getByTestId('count').textContent).toBe('Count: 1');

      onCleanup(() => console.log('cleanup'));
      unmount();
    });
  });
});
