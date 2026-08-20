import { anchor } from '@airlib/core';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import type { Ref } from 'vue';
import { observedRef } from '../../src/index.js';

describe('Anchor Vue - Observable', () => {
  describe('observedRef', () => {
    describe('Basic Usage', () => {
      it('should create an observed reference with initial value', async () => {
        const state = anchor({ value: 'test value' });
        const wrapper = mount({
          template: '<div>{{ observedValue }}</div>',
          setup() {
            const observedValue = observedRef(() => state.value);

            (observedValue as Ref<string>).value = 'changed'; // Should be no-op.

            return { observedValue };
          },
        });

        expect(wrapper.text()).toBe('test value');

        state.value = 'updated value';
        await wrapper.vm.$nextTick();

        expect(wrapper.text()).toBe('test value');
        wrapper.unmount();
      });
    });
  });
});
