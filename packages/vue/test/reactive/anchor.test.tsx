import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { anchorRef } from '../../src/index.js';

describe('Anchor Vue - Reactive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('anchorRef', () => {
    describe('Basic Usage', () => {
      it('should render and re-render the updated state', async () => {
        const wrapper = mount({
          template: `
            <div>
              <p>Count: {{ state.count }}</p>
              <button @click="increment">Click</button>
            </div>
          `,
          setup() {
            const state = anchorRef({ count: 0 });

            const increment = () => {
              state.value.count++;
            };

            return { state, increment };
          },
        });

        vi.runAllTimers();

        const text = wrapper.find('p');
        const button = wrapper.find('button');

        expect(text.text()).toBe('Count: 0');
        await button.trigger('click');
        await wrapper.vm.$nextTick();
        expect(text.text()).toBe('Count: 1');
      });
    });
  });
});
