import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ImmutableBasic from './immutable/immutable-basic.svelte';
import WritableBasic from './immutable/writable-basic.svelte';

describe('Anchor Svelte - Immutable', () => {
  describe('immutableRef', () => {
    describe('Basic Usage', () => {
      it('should create an immutable state with initial value', () => {
        render(ImmutableBasic);

        expect(screen.getByTestId('state-value').textContent).toBe('42-test');
      });
    });
  });

  describe('writableRef', () => {
    describe('Basic Usage', () => {
      it('should create a mutable reference to a reactive state', () => {
        render(WritableBasic);

        expect(screen.getByTestId('state-value').textContent).toBe('42');
      });
    });
  });
});
