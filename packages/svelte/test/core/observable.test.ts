import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ObservableBasic from './observable/observable-basic.svelte';

describe('Anchor Svelte - Observable', () => {
  describe('observedRef', () => {
    describe('Basic Usage', () => {
      it('should create an observed reference with initial value', async () => {
        render(ObservableBasic);

        expect(screen.getByTestId('observed-value').textContent).toBe('test value');

        await screen.getByTestId('update-state').click();
        expect(screen.getByTestId('observed-value').textContent).toBe('updated value');
      });
    });
  });
});
