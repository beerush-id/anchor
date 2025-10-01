import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { exceptionRef, modelRef } from '../../src/model.js';
import { z } from 'zod';
import { anchor } from '@anchorlib/core';
import { anchorRef } from '../../src/index.js';

describe('Anchor Vue - Model', () => {
  describe('modelRef', () => {
    describe('Basic Usage', () => {
      it('should create a model state with initial value', () => {
        const UserSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const initialValue = { name: 'John', age: 30 };
        const wrapper = mount({
          template: '<div>{{ state.name }}-{{ state.age }}</div>',
          setup() {
            const state = modelRef(UserSchema, initialValue);
            return { state };
          },
        });

        expect(wrapper.text()).toBe('John-30');
      });
    });
  });

  describe('exceptionRef', () => {
    describe('Basic Usage', () => {
      it('should create an exception map for handling errors', () => {
        const state = anchor({ count: 42 });
        const wrapper = mount({
          template: '<div>{{ Object.keys(exception.errors).length }}</div>',
          setup() {
            const exception = exceptionRef(state);
            return { exception };
          },
        });

        expect(wrapper.text()).toBe('0');
        expect(typeof wrapper.vm.exception).toBe('object');
      });

      it('should log error for passing ref to exceptionRef', () => {
        vi.useFakeTimers();

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const wrapper = mount({
          template: '<div>{{ Object.keys(exception.errors).length }}</div>',
          setup() {
            const state = anchorRef({ count: 42 });
            const exception = exceptionRef(state);
            return { exception };
          },
        });

        vi.runAllTimers();

        expect(wrapper.text()).toBe('0');
        expect(typeof wrapper.vm.exception).toBe('object');
        expect(errorSpy).toHaveBeenCalled();
        errorSpy.mockRestore();
        vi.useRealTimers();
      });
    });
  });
});
