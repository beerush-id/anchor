import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import VariableRef from './ref/variable-ref.svelte';
import VariableRefSubscribe from './ref/variable-ref-subscribe.svelte';
import ConstantRef from './ref/constant-ref.svelte';

describe('Anchor Svelte - Ref System', () => {
  describe('variableRef', () => {
    describe('Basic', () => {
      it('should create a variable ref with initial value', async () => {
        const result = render(VariableRef);

        const button = screen.getByRole('button');

        expect(screen.getByTestId('state-value').textContent).toBe('42');

        await button.click();

        expect(screen.getByTestId('state-value').textContent).toBe('43');
        result.unmount();
      });

      it('should cleanup non-template subscription', async () => {
        render(VariableRefSubscribe);

        expect(screen.getByTestId('state-value').textContent).toBe('42');
      });
    });
  });

  describe('constantRef', () => {
    describe('Basic', () => {
      it('should create a constant ref with initial value', () => {
        render(ConstantRef);

        expect(screen.getByTestId('state-value').textContent).toBe('42');
      });
    });
  });
});
