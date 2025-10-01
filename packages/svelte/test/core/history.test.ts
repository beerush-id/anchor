import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import HistoryBasic from './history/history-basic.svelte';

describe('Anchor Svelte - History', () => {
  describe('historyRef', () => {
    describe('Basic Usage', () => {
      it('should create a history state with initial value', () => {
        render(HistoryBasic);

        expect(screen.getByTestId('can-backward').textContent).toBe('false');
        expect(screen.getByTestId('can-forward').textContent).toBe('false');
        // We can't easily test the function types in Svelte like we do in Vue
      });
    });
  });
});
