import { mutable } from '@anchorlib/core';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import { anchor } from '../../src/core/index.js';
import AnchorBasic from './anchor/anchor-basic.svelte';
import FlatBasic from './anchor/flat-basic.svelte';
import OrderedBasic from './anchor/ordered-basic.svelte';
import RawBasic from './anchor/raw-basic.svelte';
import ReactiveBasic from './anchor/reactive-basic.svelte';

describe('Anchor Svelte - Anchor System', () => {
  describe('anchorRef', () => {
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

  describe('reactiveRef', () => {
    it('should create a reactive reference with initial value', () => {
      render(ReactiveBasic);

      expect(screen.getByTestId('state-value').textContent).toBe('42-test');
    });
  });

  describe('flatRef', () => {
    it('should create a flattened reactive reference', () => {
      render(FlatBasic);

      expect(screen.getByTestId('array-length').textContent).toBe('3');
    });
  });

  describe('orderedRef', () => {
    it('should create a sorted reactive reference', () => {
      render(OrderedBasic);

      expect(screen.getByTestId('array-value').textContent).toBe('1,2,3');
    });
  });

  describe('rawRef', () => {
    it('should create a raw reactive reference', () => {
      render(RawBasic);

      expect(screen.getByTestId('state-value').textContent).toBe('42-test');
    });
  });
});
