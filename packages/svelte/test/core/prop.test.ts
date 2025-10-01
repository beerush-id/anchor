import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import PropBasic from './prop/prop-basic.svelte';

describe('Anchor Svelte - Prop', () => {
  describe('propsRef', () => {
    describe('Basic Usage', () => {
      it('should create a props reference object with mixed values', () => {
        render(PropBasic);

        expect(screen.getByTestId('count').textContent).toBe('42');
        expect(screen.getByTestId('name').textContent).toBe('test-name');
      });
    });
  });
});
