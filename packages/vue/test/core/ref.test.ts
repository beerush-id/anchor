import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { constantRef, variableRef } from '../../src/ref.js';
import type { Ref } from 'vue';

describe('Anchor Vue - Ref System', () => {
  describe('variableRef', () => {
    describe('Basic', () => {
      it('should create a variable ref with initial value', () => {
        const wrapper = mount({
          template: '<div>{{ state }}</div>',
          setup() {
            const state = variableRef(42);
            return { state };
          },
        });

        expect(wrapper.text()).toBe('42');
      });

      it('should create a variable ref with initial value', () => {
        const wrapper = mount({
          template: '<div>{{ state }}</div>',
          setup() {
            const state = variableRef(42);
            state.value = 42; // No-op due to same value.
            return { state };
          },
        });

        expect(wrapper.text()).toBe('42');
      });

      it('should log error for setting up ref outside component', () => {
        vi.useFakeTimers();
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const state = variableRef(42);
        const wrapper = mount({
          template: '<div>{{ state }}</div>',
          setup() {
            return { state };
          },
        });

        vi.runAllTimers();

        expect(wrapper.text()).toBe('42');
        expect(errorSpy).toHaveBeenCalled();

        errorSpy.mockRestore();
        vi.useRealTimers();
      });
    });
  });

  describe('constantRef', () => {
    describe('Basic', () => {
      it('should create a constant ref with initial value', () => {
        const wrapper = mount({
          template: '<div>{{ state }}</div>',
          setup() {
            const state = constantRef(42);
            return { state };
          },
        });

        expect(wrapper.text()).toBe('42');
      });

      it('should prevent updating a constant value', () => {
        const wrapper = mount({
          template: '<div>{{ state }}</div>',
          setup() {
            const state = constantRef(42);

            (state as Ref<number>).value = 43; // No-op.

            return { state };
          },
        });

        expect(wrapper.text()).toBe('42');
      });
    });
  });
});
