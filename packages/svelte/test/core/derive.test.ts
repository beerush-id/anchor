import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import DerivedFromSource from './derive/derived-from-source.svelte';
import DerivedFromRef from './derive/derived-from-ref.svelte';
import DerivedWithoutTransform from './derive/derived-without-transform.svelte';
import DerivedWithUpdate from './derive/derived-with-update.svelte';

describe('Anchor Svelte - Derive System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('derivedRef', () => {
    describe('Basic Usage', () => {
      it('should create a derived reference from a source state', () => {
        render(DerivedFromSource);

        vi.runAllTimers();
        expect(screen.getByTestId('derived-value').textContent).toBe('84');
      });

      it('should create a derived reference from a ref object', () => {
        render(DerivedFromRef);

        vi.runAllTimers();
        expect(screen.getByTestId('derived-value').textContent).toBe('84');
      });

      it('should create a derived reference without transform function', () => {
        render(DerivedWithoutTransform);

        vi.runAllTimers();
        expect(screen.getByTestId('derived-value').textContent).toBe('100');
      });

      it('should update derived value when source changes', async () => {
        render(DerivedWithUpdate);

        vi.runAllTimers();
        expect(screen.getByTestId('derived-value').textContent).toBe('84');

        await screen.getByTestId('increment').click();
        expect(screen.getByTestId('derived-value').textContent).toBe('100');
      });
    });
  });
});
