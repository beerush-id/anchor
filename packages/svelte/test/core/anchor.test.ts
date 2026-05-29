import { act, render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { anchor, mutable, onCleanup } from '../../src/core/index.js';
import AnchorBasic from './anchor/anchor-basic.svelte';
import CounterBasic from './anchor/counter.svelte';
import ReactiveBasic from './anchor/reactive-basic.svelte';

describe('Anchor Svelte - Client', () => {
  describe('mutable', () => {
    describe('Basic Usage', () => {
      it('should create a reactive reference with initial value', () => {
        render(AnchorBasic);

        expect(() => mutable(0)).not.toThrow();
        expect(screen.getByTestId('state-value').textContent).toBe('42-test');
      });

      it('should import from the core path', () => {
        expect(typeof anchor).toBe('function');
      });
    });
  });

  describe('reactive', () => {
    it('should create a reactive reference with initial value', async () => {
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

      onCleanup(() => {});
      unmount();
    });
  });
});
