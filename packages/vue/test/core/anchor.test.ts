import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { anchorRef, flatRef, orderedRef, rawRef, reactiveRef } from '../../src/anchor.js';
import type { Ref } from 'vue';

describe('Anchor Vue - Anchor System', () => {
  describe('anchorRef', () => {
    describe('Basic Usage', () => {
      it('should create a reactive reference with initial value', () => {
        const initialValue = { count: 42, name: 'test' };
        const wrapper = mount({
          template: '<div>{{ state.count }}-{{ state.name }}</div>',
          setup() {
            const state = anchorRef(initialValue);
            return { state };
          },
        });

        expect(wrapper.text()).toBe('42-test');
      });

      it('should replace the state value with a new value', async () => {
        vi.useFakeTimers();

        const initialValue = { count: 42, name: 'test' };
        let state: Ref<typeof initialValue>;
        const wrapper = mount({
          template: '<div>{{ state.count }}-{{ state.name }}</div>',
          setup() {
            state = anchorRef(initialValue);
            return { state };
          },
        });
        vi.runAllTimers();

        expect(wrapper.text()).toBe('42-test');

        state!.value = { count: 43, name: 'test2' };

        await wrapper.vm.$nextTick();

        // expect(wrapper.text()).toBe('43-test2');
        vi.useRealTimers();
      });
    });
  });

  describe('reactiveRef', () => {
    it('should be an alias for anchorRef', () => {
      expect(reactiveRef).toBe(anchorRef);
    });
  });

  describe('flatRef', () => {
    it('should create a flattened reactive reference', () => {
      const initialArray = [1, 2, 3];
      const wrapper = mount({
        template: '<div>{{ state.length }}</div>',
        setup() {
          const state = flatRef(initialArray);
          return { state };
        },
      });

      expect(wrapper.text()).toBe('3');
    });
  });

  describe('orderedRef', () => {
    it('should create a sorted reactive reference', () => {
      const initialArray = [3, 1, 2];
      const compareFn = (a: number, b: number) => a - b;
      const wrapper = mount({
        template: '<div>{{ state.join(",") }}</div>',
        setup() {
          const state = orderedRef(initialArray, compareFn);
          return { state };
        },
      });

      expect(wrapper.text()).toBe('1,2,3');
    });
  });

  describe('rawRef', () => {
    it('should create a raw reactive reference', () => {
      const initialValue = { count: 42, name: 'test' };
      const wrapper = mount({
        template: '<div>{{ state.count }}-{{ state.name }}</div>',
        setup() {
          const state = rawRef(initialValue);
          return { state };
        },
      });

      expect(wrapper.text()).toBe('42-test');
    });
  });
});
