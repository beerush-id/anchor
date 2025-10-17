import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import ModelBasic from './model/model-basic.svelte';
import ExceptionBasic from './model/exception-basic.svelte';
import ModelError from './model/model-error.svelte';

describe('Anchor Svelte - Model', () => {
  describe('modelRef', () => {
    describe('Basic Usage', () => {
      it('should create a model state with initial value', () => {
        render(ModelBasic);

        expect(screen.getByTestId('state-value').textContent).toBe('John-30');
      });
    });
  });

  describe('exceptionRef', () => {
    describe('Basic Usage', () => {
      it('should create an exception map for handling errors', () => {
        render(ExceptionBasic);

        expect(screen.getByTestId('exception-errors').textContent).toBe('0');
      });

      it('should log error for invalid mutation', () => {
        vi.useFakeTimers();

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        render(ModelError);

        vi.runAllTimers();

        expect(screen.getByTestId('exception-errors').textContent).toBe('42');
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
        vi.useRealTimers();
      });
    });
  });
});
